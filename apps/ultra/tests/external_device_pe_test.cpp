#include "../src-tauri/native/external_device/pe_image.hpp"
#include <cassert>
#include <cstring>
#include <stdexcept>
#include <vector>
#include <clocale>
#include <string>
extern "C" void* ultra_shim_context_create(void);
extern "C" void ultra_shim_context_destroy(void*);
extern "C" void ultra_shim_set_unsupported(void*,unsigned,const char*);
extern "C" void ultra_shim_unsupported(unsigned);
extern "C" int ultra_shim_call(void*,void*,const uintptr_t[8],uintptr_t*);
extern "C" const char* ultra_shim_error(void);
extern "C" void* ultra_shim_resolve(const char*);
extern "C" int ultra_shim_readable(void*,const void*,size_t);

namespace {
template<class T>void put(std::vector<uint8_t>& bytes,size_t at,T value){std::memcpy(bytes.data()+at,&value,sizeof(value));}
bool rejected(const std::vector<uint8_t>& bytes){try{ultra_external::PeImage::validate(bytes);return false;}catch(const std::runtime_error&){return true;}}
void __attribute__((ms_abi)) missing_import(){ultra_shim_unsupported(0);}
}
int main(){
 assert(ultra_external::sha256({})=="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
 assert(ultra_external::sha256({'a','b','c'})=="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 for(unsigned length=0;length<64;++length)assert(rejected(std::vector<uint8_t>(length)));
 std::vector<uint8_t> valid(1024);put<uint16_t>(valid,0,0x5a4d);put<uint32_t>(valid,0x3c,64);put<uint32_t>(valid,64,0x4550);put<uint16_t>(valid,68,0x8664);put<uint16_t>(valid,70,1);put<uint16_t>(valid,84,240);
 constexpr size_t opt=88,section=328;put<uint16_t>(valid,opt,0x20b);put<uint32_t>(valid,opt+32,4096);put<uint32_t>(valid,opt+56,8192);put<uint32_t>(valid,opt+60,512);put<uint32_t>(valid,opt+108,16);
 put<uint32_t>(valid,section+8,4096);put<uint32_t>(valid,section+12,4096);put<uint32_t>(valid,section+16,512);put<uint32_t>(valid,section+20,512);put<uint32_t>(valid,section+36,0x60000020);assert(!rejected(valid));
 auto bad=valid;put<uint32_t>(bad,0x3c,UINT32_MAX);assert(rejected(bad));
 bad=valid;put<uint32_t>(bad,section+20,1000);assert(rejected(bad));
 bad=valid;put<uint32_t>(bad,section+8,8192);assert(rejected(bad));
 bad=valid;put<uint32_t>(bad,opt+56,UINT32_MAX);assert(rejected(bad));
 bad=valid;put<uint32_t>(bad,opt+112,8191);put<uint32_t>(bad,opt+116,40);assert(rejected(bad));
 bad=valid;put<uint16_t>(bad,70,2);std::memcpy(bad.data()+section+40,bad.data()+section,40);assert(rejected(bad));
 void* context=ultra_shim_context_create();assert(context);ultra_shim_set_unsupported(context,0,"test!cold_import");uintptr_t result=0;const uintptr_t args[8]{};
 assert(!ultra_shim_call(context,reinterpret_cast<void*>(&missing_import),args,&result));
 assert(std::strcmp(ultra_shim_error(),"test!cold_import")==0);
 assert(std::setlocale(LC_ALL,"C.UTF-8"));const std::string before=std::setlocale(LC_ALL,nullptr);
 const uintptr_t locale_args[8]={0,reinterpret_cast<uintptr_t>("C")};
 assert(ultra_shim_call(context,ultra_shim_resolve("setlocale"),locale_args,&result));
 assert(before==std::setlocale(LC_ALL,nullptr));
 auto imported=[&](const char* name,uintptr_t first=0,uintptr_t second=0){
  const uintptr_t arguments[8]={first,second};uintptr_t returned=0;
  assert(ultra_shim_call(context,ultra_shim_resolve(name),arguments,&returned));return returned;
 };
 auto readable=[&](uintptr_t address,size_t size){return ultra_shim_readable(context,reinterpret_cast<void*>(address),size);};
 const auto anchor=imported("malloc",16);
 uintptr_t allocation=imported("malloc",32);
 const auto guard=imported("malloc",8);
 assert(anchor&&allocation&&guard&&readable(allocation,32)&&!readable(allocation,33));
 std::memset(reinterpret_cast<void*>(allocation),0x5a,32);
 allocation=imported("realloc",allocation,128);
 assert(allocation&&readable(allocation,128)&&!readable(allocation,129));
 for(unsigned i=0;i<32;++i)assert(reinterpret_cast<unsigned char*>(allocation)[i]==0x5a);
 assert(imported("realloc",allocation,UINTPTR_MAX)==0);
 assert(readable(allocation,128)&&!readable(allocation,129));
 for(unsigned i=0;i<32;++i)assert(reinterpret_cast<unsigned char*>(allocation)[i]==0x5a);
 const uintptr_t freed_address=allocation;
 assert(imported("realloc",allocation,0)==0);allocation=0;
 assert(!readable(freed_address,1)&&readable(anchor,16)&&readable(guard,8));
 const auto from_null=imported("realloc",0,24);assert(from_null&&readable(from_null,24));
 imported("free",from_null);
 ultra_shim_context_destroy(context);
}
