#include "../src-tauri/native/document_batch.h"
#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/canvas_message.hpp"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>

static UltraCanvasGraph number(uint64_t revision,double value){
 UltraCanvasGraph g{};g.revision=revision;g.node_count=1;g.nodes[0]={1,ultra::Number,0,0,value,0,0};return g;
}
static UltraPreparedDocumentV1 row(unsigned document,const UltraCanvasGraph& graph){
 return {sizeof(UltraPreparedDocumentV1),document,&graph,nullptr,0,0};
}
static void expect(unsigned document,uint64_t revision,unsigned count){
 UltraCanvasStatus s{};ultra_canvas_status_document(document,&s);assert(s.revision==revision&&s.node_count==count);
}
int main(){
 char error[512]{};ultra_audio_stop();
 auto old=number(1,10),next=number(2,20),unrelated=number(1,90);
 assert(ultra_canvas_install_document(0,&old));assert(ultra_canvas_install_document(1,&old));
 assert(ultra_canvas_install_document(9,&unrelated));
 std::array<UltraPreparedDocumentV1,2> rows{row(0,next),row(2,next)};
 auto* batch=ultra_prepare_document_batch_v1(rows.data(),rows.size(),error,sizeof error);assert(batch);
 assert(!ultra_prepare_document_batch_v1(nullptr,0,error,sizeof error));
 expect(0,1,1);expect(1,1,1);expect(9,1,1);
 UltraDocumentExchange* undo=nullptr;
 assert(!ultra_exchange_document_batch_v1(batch,0x7f,&undo,error,sizeof error));assert(!undo);
 assert(std::strstr(error,"Invalid document ownership mask"));
 assert(!ultra_exchange_document_batch_v1(batch,1u<<16,&undo,error,sizeof error));assert(!undo);
 assert(std::strstr(error,"Invalid document ownership mask"));
 assert(!ultra_exchange_document_batch_v1(batch,2,&undo,error,sizeof error));assert(!undo);
 assert(ultra_external_start());
 assert(!ultra_exchange_document_batch_v1(batch,3,&undo,error,sizeof error));assert(!undo);
 ultra_audio_stop();
 assert(ultra_exchange_document_batch_v1(batch,3,&undo,error,sizeof error));assert(undo);
 expect(0,2,1);expect(1,1,0);expect(2,2,1);expect(9,1,1);
 assert(!ultra_exchange_document_batch_v1(batch,3,&undo,error,sizeof error));
 ultra_release_document_batch_v1(batch);
 std::array<uint64_t,16> revisions{};revisions.fill(2);
 assert(!ultra_restore_document_exchange_v1(undo,revisions.data(),revisions.size(),error,sizeof error));
 expect(0,2,1);expect(2,2,1);
 revisions.fill(3);
 assert(ultra_restore_document_exchange_v1(undo,revisions.data(),revisions.size(),error,sizeof error));
 expect(0,3,1);expect(1,3,1);expect(2,3,0);expect(9,1,1);
 assert(!ultra_restore_document_exchange_v1(undo,revisions.data(),revisions.size(),error,sizeof error));
 ultra_release_document_exchange_v1(undo);
 // A failed late candidate leaves every installed root unchanged.
 auto invalid=number(4,1);invalid.nodes[0].kind=10000;
 rows={row(0,next),row(2,invalid)};
 assert(!ultra_prepare_document_batch_v1(rows.data(),rows.size(),error,sizeof error));
 expect(0,3,1);expect(1,3,1);expect(9,1,1);
 // Commit an empty candidate, retiring only roots owned by this caller.
 batch=ultra_prepare_document_batch_v1(nullptr,0,error,sizeof error);assert(batch);undo=nullptr;
 assert(ultra_exchange_document_batch_v1(batch,3,&undo,error,sizeof error));
 ultra_release_document_batch_v1(batch);ultra_release_document_exchange_v1(undo);
 expect(0,3,0);expect(1,3,0);expect(9,1,1);
 assert(ultra_canvas_close_document(9));
 std::puts("PASS: bounded staged document exchange, driver fence, restore, commit and unrelated roots");
}
