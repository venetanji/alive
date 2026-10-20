#include "instrument.hpp"
#include <cstdlib>
#include <new>
#include <pthread.h>
#include <stdexcept>
thread_local bool measuring=false;
thread_local Work work;
extern "C" {
void* __real_malloc(size_t);void __real_free(void*);void* __real_calloc(size_t,size_t);void* __real_realloc(void*,size_t);int __real_pthread_mutex_lock(pthread_mutex_t*);
void* __wrap_malloc(size_t n){if(measuring)++work.allocations;return __real_malloc(n);}
void __wrap_free(void*p){if(measuring&&p)++work.frees;__real_free(p);}
void* __wrap_calloc(size_t a,size_t b){if(measuring)++work.allocations;return __real_calloc(a,b);}
void* __wrap_realloc(void*p,size_t n){if(measuring)++work.allocations;return __real_realloc(p,n);}
int __wrap_pthread_mutex_lock(pthread_mutex_t*m){if(measuring)++work.locks;return __real_pthread_mutex_lock(m);}
}
void* operator new(size_t n){if(auto*p=__wrap_malloc(n))return p;throw std::bad_alloc();}
void* operator new[](size_t n){return ::operator new(n);}
void* operator new(size_t n,const std::nothrow_t&)noexcept{try{return ::operator new(n);}catch(...){return nullptr;}}
void* operator new[](size_t n,const std::nothrow_t&)noexcept{try{return ::operator new[](n);}catch(...){return nullptr;}}
void operator delete(void*p,const std::nothrow_t&)noexcept{__wrap_free(p);}
void operator delete[](void*p,const std::nothrow_t&)noexcept{__wrap_free(p);}
void operator delete(void*p)noexcept{__wrap_free(p);}void operator delete[](void*p)noexcept{__wrap_free(p);}
void operator delete(void*p,size_t)noexcept{__wrap_free(p);}void operator delete[](void*p,size_t)noexcept{__wrap_free(p);}
void instrumentation_control(){
 pthread_mutex_t m=PTHREAD_MUTEX_INITIALIZER;work={};measuring=true;
 void* (*volatile allocate)(size_t)=std::malloc;
 void (*volatile release)(void*)=std::free;
 int (*volatile lock)(pthread_mutex_t*)=pthread_mutex_lock;
 void* volatile p=allocate(7);release(p);lock(&m);pthread_mutex_unlock(&m);
 measuring=false;pthread_mutex_destroy(&m);if(work.allocations!=1||work.frees!=1||work.locks!=1)throw std::runtime_error("instrumentation control");work={};
}
