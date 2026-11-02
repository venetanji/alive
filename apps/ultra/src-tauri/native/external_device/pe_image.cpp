#include "pe_image.hpp"
#if defined(ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL) && defined(__linux__) && defined(__x86_64__)
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <stdexcept>
#include <sys/mman.h>

extern "C" void* ultra_shim_resolve(const char*);
extern "C" void ultra_shim_set_unsupported(void*,unsigned,const char*);
extern "C" void ultra_shim_unsupported(unsigned);

namespace ultra_external {
namespace {
void require(bool condition,const char* message){if(!condition)throw std::runtime_error(message);}
struct Bytes {
 const uint8_t* data;size_t size;
 void bound(size_t at,size_t length)const{require(at<=size&&length<=size-at,"PE range exceeds resource");}
 template<class T>T get(size_t at)const{bound(at,sizeof(T));T value;std::memcpy(&value,data+at,sizeof(T));return value;}
 std::string text(size_t at,size_t limit=512)const{
  bound(at,1);const size_t n=std::min(limit,size-at);const auto* end=static_cast<const uint8_t*>(std::memchr(data+at,0,n));
  require(end,"PE string is not terminated");return std::string(reinterpret_cast<const char*>(data+at),size_t(end-data-at));
 }
};
struct Section{uint32_t rva,size,raw,offset,flags;};
struct Layout {
 Bytes bytes;uint64_t preferred;uint32_t size,headers;size_t optional;
 std::vector<Section> sections;
 explicit Layout(const std::vector<uint8_t>& input):bytes{input.data(),input.size()}{
  bytes.bound(0,64);require(bytes.get<uint16_t>(0)==0x5a4d,"resource is not MZ");
  const auto pe=bytes.get<uint32_t>(0x3c);bytes.bound(pe,24);
  require(bytes.get<uint32_t>(pe)==0x4550&&bytes.get<uint16_t>(pe+4)==0x8664,"resource is not x86-64 PE");
  const auto count=bytes.get<uint16_t>(pe+6),optional_size=bytes.get<uint16_t>(pe+20);
  require(count&&count<=32&&optional_size>=240,"unsupported PE header layout");
  optional=size_t(pe)+24;bytes.bound(optional,optional_size);
  require(bytes.get<uint16_t>(optional)==0x20b&&bytes.get<uint32_t>(optional+32)==4096,"unsupported PE32+ alignment");
  require(bytes.get<uint32_t>(optional+108)>=6,"missing PE data directories");
  preferred=bytes.get<uint64_t>(optional+24);size=bytes.get<uint32_t>(optional+56);headers=bytes.get<uint32_t>(optional+60);
  require(size>=4096&&size<=64*1024*1024&&size%4096==0,"unsupported PE image size");
  require(headers&&headers<=size,"invalid PE headers size");bytes.bound(0,headers);
  size_t table=optional+optional_size;bytes.bound(table,size_t(count)*40);
  require(table+size_t(count)*40<=headers,"section table exceeds PE headers");
  for(unsigned i=0;i<count;++i){
   const size_t at=table+i*40;
   Section s{bytes.get<uint32_t>(at+12),bytes.get<uint32_t>(at+8),bytes.get<uint32_t>(at+16),bytes.get<uint32_t>(at+20),bytes.get<uint32_t>(at+36)};
   const auto extent=std::max(s.size,s.raw);
   require(s.rva%4096==0&&s.rva>=((headers+4095)&~4095u)&&s.rva<=size&&extent<=size-s.rva,"invalid PE section extent");
   bytes.bound(s.offset,s.raw);
   for(const auto& prior:sections)require(uint64_t(s.rva)+extent<=prior.rva||uint64_t(prior.rva)+std::max(prior.size,prior.raw)<=s.rva,"overlapping PE sections");
   sections.push_back(s);
  }
  for(unsigned i:{0u,1u,5u}){const auto d=directory(i);require(d.first<=size&&d.second<=size-d.first,"invalid PE directory extent");}
 }
 std::pair<uint32_t,uint32_t> directory(unsigned index)const{return {bytes.get<uint32_t>(optional+112+index*8),bytes.get<uint32_t>(optional+116+index*8)};}
};
uint32_t rotate(uint32_t value,unsigned bits){return (value>>bits)|(value<<(32-bits));}
}

// SHA-256 is used for exact local resource qualification, not authenticity.
std::string sha256(const std::vector<uint8_t>& input){
 static constexpr uint32_t k[]={0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
 uint32_t h[]={0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
 auto bytes=input;const uint64_t bits=uint64_t(bytes.size())*8;bytes.push_back(0x80);while(bytes.size()%64!=56)bytes.push_back(0);
 for(int shift=56;shift>=0;shift-=8)bytes.push_back(uint8_t(bits>>shift));
 for(size_t pos=0;pos<bytes.size();pos+=64){
  uint32_t w[64]{};for(unsigned i=0;i<16;++i)for(unsigned j=0;j<4;++j)w[i]=(w[i]<<8)|bytes[pos+i*4+j];
  for(unsigned i=16;i<64;++i)w[i]=w[i-16]+(rotate(w[i-15],7)^rotate(w[i-15],18)^(w[i-15]>>3))+w[i-7]+(rotate(w[i-2],17)^rotate(w[i-2],19)^(w[i-2]>>10));
  uint32_t a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],z=h[7];
  for(unsigned i=0;i<64;++i){const auto t1=z+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+k[i]+w[i];const auto t2=(rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c));z=g;g=f;f=e;e=d+t1;d=c;c=b;b=a;a=t1+t2;}
  h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=z;
 }
 char result[65]{};for(unsigned i=0;i<8;++i)std::snprintf(result+i*8,9,"%08x",h[i]);return result;
}

void PeImage::validate(const std::vector<uint8_t>& bytes){Layout parsed(bytes);(void)parsed;}
PeImage::PeImage(const std::vector<uint8_t>& bytes,void* shim_context){
 try{
  const Layout layout(bytes);image_size_=layout.size;
  image_=mmap(reinterpret_cast<void*>(layout.preferred),image_size_,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  require(image_!=MAP_FAILED,"PE mmap failed");
  auto* base=static_cast<uint8_t*>(image_);std::memcpy(base,bytes.data(),layout.headers);
  for(const auto& section:layout.sections)std::memcpy(base+section.rva,bytes.data()+section.offset,section.raw);
  const Bytes mapped{base,image_size_};
  auto patch=[&](size_t at,uint64_t value){mapped.bound(at,8);std::memcpy(base+at,&value,8);};
  auto reloc=layout.directory(5);size_t pos=reloc.first,end=pos+reloc.second;
  require(reloc.second||reinterpret_cast<uintptr_t>(base)==layout.preferred,"PE relocation directory missing");
  while(pos<end){
   require(end-pos>=8,"truncated PE relocation block");const auto page=mapped.get<uint32_t>(pos),block=mapped.get<uint32_t>(pos+4);
   require(block>=8&&block%2==0&&block<=end-pos,"invalid PE relocation block");
   for(size_t at=pos+8;at<pos+block;at+=2){const auto item=mapped.get<uint16_t>(at);if(!(item>>12))continue;require((item>>12)==10,"unsupported PE relocation type");const size_t location=size_t(page)+(item&4095);patch(location,mapped.get<uint64_t>(location)+reinterpret_cast<uintptr_t>(base)-layout.preferred);}
   pos+=block;
  }
  trap_size_=32768;traps_=mmap(nullptr,trap_size_,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);require(traps_!=MAP_FAILED,"import trap mmap failed");
  auto imports=layout.directory(1);require(imports.second>=20,"PE import directory missing");unsigned ordinal=0;bool terminated=false;
  for(pos=imports.first;pos+20<=size_t(imports.first)+imports.second;pos+=20){
   const auto module_rva=mapped.get<uint32_t>(pos+12);if(!module_rva){terminated=true;break;}const auto module=mapped.text(module_rva);
   const auto thunk=mapped.get<uint32_t>(pos+16);auto original=mapped.get<uint32_t>(pos);if(!original)original=thunk;
   for(unsigned i=0;;++i){
    require(ordinal<1024&&i<1024,"too many PE imports");const auto entry=mapped.get<uint64_t>(size_t(original)+i*8);if(!entry)break;
    require(!(entry>>63)&&entry<=UINT32_MAX-2,"ordinal PE imports unsupported");const auto name=mapped.text(size_t(entry)+2);
    auto* function=ultra_shim_resolve(name.c_str());
    if(!function){
     ultra_shim_set_unsupported(shim_context,ordinal,(module+"!"+name).c_str());auto* stub=static_cast<uint8_t*>(traps_)+ordinal*32;
     stub[0]=0xbf;std::memcpy(stub+1,&ordinal,4);stub[5]=0x48;stub[6]=0xb8;const auto failure=reinterpret_cast<uint64_t>(&ultra_shim_unsupported);std::memcpy(stub+7,&failure,8);stub[15]=0xff;stub[16]=0xe0;function=stub;
    }
    patch(size_t(thunk)+i*8,reinterpret_cast<uint64_t>(function));++ordinal;
   }
  }
  require(terminated,"unterminated PE import directory");
  const auto exports=layout.directory(0);require(exports.second>=40,"PE export directory missing");
  const auto number=mapped.get<uint32_t>(exports.first+24),function_count=mapped.get<uint32_t>(exports.first+20);
  require(number<=1024&&function_count<=1024,"excessive PE exports");
  const auto names=mapped.get<uint32_t>(exports.first+32),functions=mapped.get<uint32_t>(exports.first+28),ordinals=mapped.get<uint32_t>(exports.first+36);
  static const char* wanted[]={"CalcA","CreateInstanceU","DestroyInstanceU","GetPlugInfoU","ResetA","SetParameterA","SetSampleRateU"};
  for(unsigned i=0;i<number;++i){
   const auto name=mapped.text(mapped.get<uint32_t>(size_t(names)+i*4));const auto index=mapped.get<uint16_t>(size_t(ordinals)+i*2);require(index<function_count,"bad PE export ordinal");const auto rva=mapped.get<uint32_t>(size_t(functions)+index*4);
   for(unsigned j=0;j<7;++j)if(name==wanted[j]){
    require(!(rva>=exports.first&&rva<size_t(exports.first)+exports.second),"forwarded PE export unsupported");bool executable=false;
    for(const auto& section:layout.sections)if(rva>=section.rva&&rva-section.rva<section.size&&(section.flags&0x20000000))executable=true;
    require(executable&&!functions_[j],"invalid PE function export");functions_[j]=base+rva;
   }
  }
  for(auto* function:functions_)require(function,"required device export missing");
  require(mprotect(traps_,trap_size_,PROT_READ|PROT_EXEC)==0,"import trap protection failed");
  require(mprotect(image_,image_size_,PROT_NONE)==0,"PE image protection failed");
  require(mprotect(image_,(layout.headers+4095)&~size_t(4095),PROT_READ)==0,"PE header protection failed");
  for(const auto& section:layout.sections){const auto extent=(std::max(section.size,section.raw)+4095)&~size_t(4095);if(!extent)continue;const int protection=((section.flags>>30)&1)|(((section.flags>>31)&1)<<1)|(((section.flags>>29)&1)<<2);require(!(protection&PROT_WRITE)||!(protection&PROT_EXEC),"writable executable PE section refused");require(mprotect(base+section.rva,extent,protection)==0,"PE section protection failed");}
 }catch(...){if(traps_&&traps_!=MAP_FAILED)munmap(traps_,trap_size_);if(image_&&image_!=MAP_FAILED)munmap(image_,image_size_);throw;}
}
PeImage::~PeImage(){if(traps_&&traps_!=MAP_FAILED)munmap(traps_,trap_size_);if(image_&&image_!=MAP_FAILED)munmap(image_,image_size_);}
}
#endif
