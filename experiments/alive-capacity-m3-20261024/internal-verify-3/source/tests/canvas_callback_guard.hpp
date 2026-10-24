#pragma once
#include <cassert>
#include <cstdlib>
#include <new>
#include <pthread.h>

namespace callback_guard {
inline bool measuring=false;
inline unsigned allocations=0,frees=0,locks=0;
inline void begin(){allocations=frees=locks=0;measuring=true;}
inline void end(){measuring=false;assert(!allocations&&!frees&&!locks);}
}
extern "C" {
void* __real_malloc(size_t);void* __real_calloc(size_t,size_t);void* __real_realloc(void*,size_t);void __real_free(void*);int __real_pthread_mutex_lock(pthread_mutex_t*);
void* __wrap_malloc(size_t size){if(callback_guard::measuring)++callback_guard::allocations;return __real_malloc(size);}
void* __wrap_calloc(size_t count,size_t size){if(callback_guard::measuring)++callback_guard::allocations;return __real_calloc(count,size);}
void* __wrap_realloc(void* ptr,size_t size){if(callback_guard::measuring)++callback_guard::allocations;return __real_realloc(ptr,size);}
void __wrap_free(void* ptr){if(callback_guard::measuring&&ptr)++callback_guard::frees;__real_free(ptr);}
int __wrap_pthread_mutex_lock(pthread_mutex_t* mutex){if(callback_guard::measuring)++callback_guard::locks;return __real_pthread_mutex_lock(mutex);}
}
void* operator new(size_t size){if(callback_guard::measuring)++callback_guard::allocations;if(void* ptr=__real_malloc(size?size:1))return ptr;throw std::bad_alloc();}
void* operator new[](size_t size){return ::operator new(size);}
void operator delete(void* ptr)noexcept{if(callback_guard::measuring&&ptr)++callback_guard::frees;__real_free(ptr);}
void operator delete[](void* ptr)noexcept{::operator delete(ptr);}
void operator delete(void* ptr,size_t)noexcept{::operator delete(ptr);}
void operator delete[](void* ptr,size_t)noexcept{::operator delete(ptr);}
