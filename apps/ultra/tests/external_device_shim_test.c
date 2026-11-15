#include "../src-tauri/native/external_device/runtime_shim.c"
#include <assert.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>

static uintptr_t imported(ShimContext *context,const char *name,uintptr_t a,uintptr_t b) {
 uintptr_t result=0;const uintptr_t arguments[8]={a,b,0,0,0,0,0,0};
 assert(ultra_shim_call(context,ultra_shim_resolve(name),arguments,&result));
 return result;
}
static unsigned records(const ShimContext *context) {
 unsigned count=0;
 for(const Allocation *record=context->allocations;record;record=record->next)assert(++count<=8192);
 return count;
}
static void null_free_without_context(void) {
 const pid_t child=fork();assert(child>=0);
 if(!child){
  const struct rlimit no_core={0,0};setrlimit(RLIMIT_CORE,&no_core);
  current_context=NULL;s_free(NULL);_exit(0);
 }
 int status=0;assert(waitpid(child,&status,0)==child);
 if(!WIFEXITED(status)||WEXITSTATUS(status)!=0)fputs("FAIL: free(NULL) must return without accessing an allocation context\n",stderr);
 assert(WIFEXITED(status)&&WEXITSTATUS(status)==0);
}
static void non_lifo_removal(void) {
 ShimContext *context=ultra_shim_context_create();assert(context);
 uintptr_t pointers[4096];
 for(unsigned i=0;i<4096;++i){pointers[i]=imported(context,"malloc",24+i%17,0);assert(pointers[i]);}
 assert(records(context)==4096);
 for(unsigned i=0;i<4096;++i){
  const unsigned index=(i*1543)%4096;
  imported(context,"free",pointers[index],0);
  assert(!ultra_shim_readable(context,(void*)pointers[index],1));
  if(i%512==511)assert(records(context)==4095-i);
 }
 assert(records(context)==0);ultra_shim_context_destroy(context);
}
static void realloc_preserves_tracking(void) {
 ShimContext *context=ultra_shim_context_create();assert(context);
 uintptr_t allocation=imported(context,"realloc",0,32);assert(allocation);
 const uintptr_t guard=imported(context,"malloc",65536,0);assert(guard);
 memset((void*)allocation,0x5a,32);assert(records(context)==2);
 const uintptr_t old=allocation;
 allocation=imported(context,"realloc",allocation,8*1024*1024);assert(allocation&&allocation!=old);
 assert(!ultra_shim_readable(context,(void*)old,1));
 assert(ultra_shim_readable(context,(void*)allocation,8*1024*1024));
 assert(!ultra_shim_readable(context,(void*)allocation,8*1024*1024+1));
 for(unsigned i=0;i<32;++i)assert(((unsigned char*)allocation)[i]==0x5a);
 assert(records(context)==2);
 assert(!imported(context,"realloc",allocation,UINTPTR_MAX));
 assert(records(context)==2&&ultra_shim_readable(context,(void*)allocation,8*1024*1024));
 for(unsigned i=0;i<32;++i)assert(((unsigned char*)allocation)[i]==0x5a);
 allocation=imported(context,"realloc",allocation,16);assert(allocation);
 assert(ultra_shim_readable(context,(void*)allocation,16)&&!ultra_shim_readable(context,(void*)allocation,17));
 for(unsigned i=0;i<16;++i)assert(((unsigned char*)allocation)[i]==0x5a);
 assert(!imported(context,"realloc",allocation,0));
 assert(records(context)==1);imported(context,"free",guard,0);assert(records(context)==0);
 for(unsigned i=0;i<1000;++i)assert(imported(context,"calloc",3,17));
 assert(records(context)==1000);
 // Sanitizers verify that context teardown releases the remaining records and payloads.
 ultra_shim_context_destroy(context);
}
int main(void) {
 const struct rlimit no_core={0,0};setrlimit(RLIMIT_CORE,&no_core);
 null_free_without_context();non_lifo_removal();realloc_preserves_tracking();
 puts("PASS: shim allocation tracking handles null free, non-LIFO removal, realloc movement/failure and context cleanup");
}
