#pragma once
// Included once by backend.cpp: all mutations share its serialized control owner.
#include "document_batch.h"
#include <bitset>

struct UltraPreparedDocumentBatch {
 struct Row {
  unsigned document=0;
  ultra::CanvasPlan plan{};
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
  std::unique_ptr<ultra::LiveDeviceBank> bank;
#endif
 };
 std::array<Row,6> rows{};
 unsigned count=0,mask=0;
 bool consumed=false;
};
struct UltraDocumentExchange {
 struct Prior {
  ultra::CanvasPlan plan{};
  uint64_t serial=0,installed_revision=0;
  bool requested=false,live=false;
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
  std::unique_ptr<ultra::LiveDeviceBank> bank,retired_candidate;
#endif
 };
 std::array<Prior,MaxDocuments> prior{};
 unsigned mask=0;
 bool restored=false;
};
namespace {
UltraPreparedDocumentBatch* pending_document_batch=nullptr;
UltraDocumentExchange* pending_document_exchange=nullptr;
int document_batch_failure(char* output,size_t capacity,const char* message){
 if(output&&capacity)std::snprintf(output,capacity,"%s",message);
 return 0;
}
bool document_exchange_quiescent()noexcept{return !running.load()&&!engine.status().ready&&!session.configured();}
void document_batch_published()noexcept{
 update_canvas_requested();sequence_requested=false;callback_canvas=canvas.any();reset_canvas_idle_clock();publish_canvas();
}
// Both bank sets remain owned until release, including after an explicit restore.
bool restore_document_rows(UltraDocumentExchange& undo,const uint64_t* revisions)noexcept{
 auto discard=[](alive::Event){return true;};canvas.begin_callback();bool ok=true;
 for(unsigned d=0;d<MaxDocuments;++d)if(undo.mask&(1u<<d)){
  auto& old=undo.prior[d];canvas.close(d,0,discard);
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
  old.retired_candidate=std::move(live_devices[d]);
#endif
  auto plan=old.plan;if(revisions)plan.graph.revision=revisions[d];
  if(canvas.runtime(d).failed())canvas.runtime(d).recover();
  if(old.live)ok=canvas.install(d,plan,0,discard)&&ok;
  else canvas.runtime(d).reset(plan,false);
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
  if(old.bank&&old.live)ok=old.bank->bind(canvas.runtime(d))&&ok;
  live_devices[d]=std::move(old.bank);
#endif
  admitted_canvas[d]=plan;admitted_message_serial[d]=old.serial;
  requested_documents[d]=old.requested;document_silence[d]=64;
 }
 document_batch_published();return ok;
}
}
extern "C" {
UltraPreparedDocumentBatch* ultra_prepare_document_batch_v1(const UltraPreparedDocumentV1* rows,uint32_t count,char* output,size_t capacity){
 try{
  if(pending_document_batch||pending_document_exchange){document_batch_failure(output,capacity,"A document transaction is already pending.");return nullptr;}
  if(count>6||(count&&!rows)){document_batch_failure(output,capacity,"A document batch requires at most six explicit rows.");return nullptr;}
  auto next=std::make_unique<UltraPreparedDocumentBatch>();next->count=count;
  for(unsigned i=0;i<count;++i){
   const auto& source=rows[i];
   if(source.struct_bytes!=sizeof(UltraPreparedDocumentV1)||source.reserved||source.document>=MaxDocuments||!source.graph||source.source_count>32||(source.source_count&&!source.sources)){
    document_batch_failure(output,capacity,"Invalid document batch row.");return nullptr;
   }
   const unsigned bit=1u<<source.document;
   if(next->mask&bit){document_batch_failure(output,capacity,"Duplicate document batch slot.");return nullptr;}next->mask|=bit;
#ifndef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
   if(source.source_count){document_batch_failure(output,capacity,"This Ultra build does not include the native Live device adapter.");return nullptr;}
#endif
   auto& candidate=next->rows[i];candidate.document=source.document;
   if(!ultra::compile_canvas(*source.graph,candidate.plan)){document_batch_failure(output,capacity,"Invalid candidate document graph.");return nullptr;}
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
   candidate.bank=ultra::LiveDeviceBank::prepare(*source.graph,source.sources,source.source_count,output,capacity);
   if(!candidate.bank)return nullptr;
#endif
  }
  pending_document_batch=next.release();if(output&&capacity)output[0]=0;return pending_document_batch;
 }catch(const std::exception& e){document_batch_failure(output,capacity,e.what());return nullptr;}
 catch(...){document_batch_failure(output,capacity,"Document batch preparation failed.");return nullptr;}
}
int ultra_exchange_document_batch_v1(UltraPreparedDocumentBatch* batch,uint32_t owned_mask,UltraDocumentExchange** result,char* output,size_t capacity){
 try{
  if(!batch||batch!=pending_document_batch||batch->consumed||pending_document_exchange||!result||*result)
   return document_batch_failure(output,capacity,"Invalid or consumed document transaction.");
  if(!document_exchange_quiescent())return document_batch_failure(output,capacity,"Document exchange requires a retired audio driver and an unconfigured session.");
  if((owned_mask>>MaxDocuments)||std::bitset<32>(owned_mask).count()>6)return document_batch_failure(output,capacity,"Invalid document ownership mask.");
  for(unsigned d=0;d<MaxDocuments;++d)if((owned_mask&(1u<<d))&&(!requested_documents[d].load()||!canvas.live(d)))
   return document_batch_failure(output,capacity,"Owned document mask no longer matches installed roots.");
  for(unsigned i=0;i<batch->count;++i){const auto& row=batch->rows[i];
   if(requested_documents[row.document].load()&&!(owned_mask&(1u<<row.document)))return document_batch_failure(output,capacity,"Candidate would replace an unrelated document.");
   if(row.plan.graph.revision<=admitted_canvas[row.document].graph.revision)return document_batch_failure(output,capacity,"Stale candidate document revision.");
  }
  auto undo=std::make_unique<UltraDocumentExchange>();undo->mask=owned_mask|batch->mask;
  for(unsigned d=0;d<MaxDocuments;++d)if(undo->mask&(1u<<d)){
   auto& old=undo->prior[d];old.plan=admitted_canvas[d];old.serial=admitted_message_serial[d];
   old.requested=requested_documents[d].load();old.live=canvas.live(d);
  }
  auto discard=[](alive::Event){return true;};canvas.begin_callback();
  for(unsigned d=0;d<MaxDocuments;++d)if(undo->mask&(1u<<d)){
   canvas.close(d,0,discard);requested_documents[d]=false;
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
   undo->prior[d].bank=std::move(live_devices[d]);
#endif
  }
  bool ok=true;
  for(unsigned i=0;i<batch->count;++i){auto& row=batch->rows[i];const unsigned d=row.document;
   if(canvas.runtime(d).failed())canvas.runtime(d).recover();
   if(!canvas.install(d,row.plan,0,discard)){ok=false;break;}
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
   if(!row.bank->bind(canvas.runtime(d))){ok=false;break;}
   live_devices[d]=row.bank->count()?std::move(row.bank):nullptr;
#endif
   admitted_canvas[d]=row.plan;admitted_message_serial[d]=0;requested_documents[d]=true;document_silence[d]=64;
  }
  if(!ok){
   const bool restored=restore_document_rows(*undo,nullptr);batch->consumed=true;pending_document_batch=nullptr;
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
   for(unsigned i=0;i<batch->count;++i){auto& row=batch->rows[i];
    if(undo->prior[row.document].retired_candidate)row.bank=std::move(undo->prior[row.document].retired_candidate);
   }
#endif
   return document_batch_failure(output,capacity,restored?"Candidate binding failed; prior document owners retained.":"Candidate binding failed and prior document binding could not be restored.");
  }
  for(unsigned d=0;d<MaxDocuments;++d)if(undo->mask&(1u<<d))undo->prior[d].installed_revision=admitted_canvas[d].graph.revision;
  batch->consumed=true;pending_document_batch=nullptr;pending_document_exchange=undo.release();*result=pending_document_exchange;
  document_batch_published();if(output&&capacity)output[0]=0;return 1;
 }catch(const std::exception& e){return document_batch_failure(output,capacity,e.what());}
 catch(...){return document_batch_failure(output,capacity,"Document exchange preparation failed.");}
}
int ultra_restore_document_exchange_v1(UltraDocumentExchange* undo,const uint64_t* revisions,uint32_t count,char* output,size_t capacity){
 if(!undo||undo!=pending_document_exchange||undo->restored||!revisions||count!=MaxDocuments)
  return document_batch_failure(output,capacity,"Invalid or consumed document exchange.");
 if(!document_exchange_quiescent())return document_batch_failure(output,capacity,"Document restore requires a retired audio driver and an unconfigured session.");
 for(unsigned d=0;d<MaxDocuments;++d)if(undo->mask&(1u<<d)){
  if(admitted_canvas[d].graph.revision!=undo->prior[d].installed_revision||revisions[d]<=admitted_canvas[d].graph.revision)
   return document_batch_failure(output,capacity,"Stale document exchange or restoration revision.");
 }
 const bool ok=restore_document_rows(*undo,revisions);undo->restored=true;
 if(!ok)return document_batch_failure(output,capacity,"Retained document binding could not be restored.");
 if(output&&capacity)output[0]=0;
 return 1;
}
void ultra_release_document_batch_v1(UltraPreparedDocumentBatch* batch){
 if(batch==pending_document_batch)pending_document_batch=nullptr;
 delete batch;
}
void ultra_release_document_exchange_v1(UltraDocumentExchange* undo){
 if(undo==pending_document_exchange)pending_document_exchange=nullptr;
 delete undo;
}
}
