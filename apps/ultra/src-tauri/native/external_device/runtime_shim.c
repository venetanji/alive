/* Original research adapter. Compile only for the explicit native-device experiment. */
#define _GNU_SOURCE
#if defined(ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL) && defined(__linux__) && defined(__x86_64__)
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <pthread.h>
#include <ctype.h>
#include <locale.h>
#include <time.h>
#include <stdarg.h>
#include <errno.h>

#define MS __attribute__((ms_abi))
#include <setjmp.h>
static _Thread_local jmp_buf boundary;
static _Thread_local char last_error[256];
static void __attribute__((noreturn)) ultra_shim_fail(const char *message) {
 snprintf(last_error,sizeof(last_error),"%s",message);
 longjmp(boundary,1);
}
enum { AllocationBuckets=4096 };
typedef struct Allocation { void *pointer;size_t bytes;struct Allocation *next,*previous,*hash_next; } Allocation;
typedef struct Lock Lock;
typedef struct ShimContext {
 Allocation *allocations;
 Allocation *allocation_buckets[AllocationBuckets];
 Lock *locks;
 char *unsupported_names[1024];
 locale_t locale;
 int locale_config;
 unsigned short ctype_table[257];
 int ctype_ready;
 struct random_data random;
 char random_state[128];
} ShimContext;
static _Thread_local ShimContext *current_context;
void *ultra_shim_context_create(void){
 ShimContext *context=calloc(1,sizeof(*context));
 if(context){context->locale=newlocale(LC_ALL_MASK,"C",0);if(!context->locale){free(context);return 0;}context->locale_config=2;initstate_r(1,context->random_state,sizeof(context->random_state),&context->random);}
 return context;
}
static Allocation **allocation_slot(void *pointer) {
 // Foreign initialization frees older blocks; avoid scanning the cleanup list.
 uint64_t hash=(uintptr_t)pointer>>4;hash^=hash>>33;hash*=UINT64_C(0xff51afd7ed558ccd);hash^=hash>>33;
 Allocation **slot=&current_context->allocation_buckets[hash&(AllocationBuckets-1)];
 while(*slot&&(*slot)->pointer!=pointer)slot=&(*slot)->hash_next;
 return slot;
}
static void index_allocation(Allocation *record) {
 Allocation **slot=allocation_slot(record->pointer);record->hash_next=*slot;*slot=record;
}
static void unlink_allocation(Allocation *record) {
 if(record->previous)record->previous->next=record->next;else current_context->allocations=record->next;
 if(record->next)record->next->previous=record->previous;
}
static void *tracked(void *pointer,size_t bytes) {
 if(pointer) {
  Allocation *a=malloc(sizeof(*a));if(!a){free(pointer);return 0;}
  *a=(Allocation){pointer,bytes,current_context->allocations,0,0};
  if(a->next)a->next->previous=a;
  current_context->allocations=a;index_allocation(a);
 }
 return pointer;
}
static void untrack(void *pointer) {
 if(!pointer)return;
 Allocation **slot=allocation_slot(pointer);
 if(*slot){Allocation *record=*slot;*slot=record->hash_next;unlink_allocation(record);free(record);}
}
int ultra_shim_readable(void *opaque,const void *pointer,size_t bytes) {
 ShimContext *context=opaque;uintptr_t p=(uintptr_t)pointer;
 for(Allocation *a=context->allocations;a;a=a->next){uintptr_t start=(uintptr_t)a->pointer;if(p>=start&&p-start<=a->bytes&&bytes<=a->bytes-(p-start))return 1;}
 return 0;
}
const char *ultra_shim_error(void){return last_error;}
static void hit(const char *name){(void)name;}

void *MS s_malloc(size_t n) { hit(__func__); return tracked(malloc(n),n); }
void *MS s_calloc(size_t a,size_t b) { hit(__func__); if(b&&a>SIZE_MAX/b)return 0;return tracked(calloc(a,b),a*b); }
void *MS s_realloc(void *p,size_t n) {
 hit(__func__);
 Allocation **slot=p?allocation_slot(p):0;
 Allocation *record=slot?*slot:0;
 void *q=realloc(p,n);
 if(!q&&n)return 0;
 // The tracking record survives realloc; the old allocation pointer may not.
 if(record){
  *slot=record->hash_next;
  if(q){record->pointer=q;record->bytes=n;index_allocation(record);}
  else{unlink_allocation(record);free(record);}
  return q;
 }
 return tracked(q,n);
}
void MS s_free(void *p) { hit(__func__); untrack(p);free(p); }
void *MS s_memcpy(void *a,const void *b,size_t n) { hit(__func__); return memcpy(a,b,n); }
void *MS s_memmove(void *a,const void *b,size_t n) { hit(__func__); return memmove(a,b,n); }
void *MS s_memset(void *a,int b,size_t n) { hit(__func__); return memset(a,b,n); }
int MS s_memcmp(const void *a,const void *b,size_t n) { hit(__func__); return memcmp(a,b,n); }
void *MS s_memchr(const void *a,int b,size_t n) { hit(__func__); return (void *)memchr(a,b,n); }
size_t MS s_strlen(const char *s) { hit(__func__); return strlen(s); }
int MS s_strcmp(const char *a,const char *b) { hit(__func__); return strcmp(a,b); }
int MS s_strncmp(const char *a,const char *b,size_t n) { hit(__func__); return strncmp(a,b,n); }
char *MS s_strcpy(char *a,const char *b) { hit(__func__); return strcpy(a,b); }
char *MS s__strdup(const char *s) { hit(__func__);return tracked(strdup(s),strlen(s)+1); }
int *MS s__errno(void) { hit(__func__);return &errno; }
double MS s_atof(const char *s) { hit(__func__);return atof(s); }
int MS s_atoi(const char *s) { hit(__func__);return atoi(s); }
float MS s_strtof(const char *s,char **end) { hit(__func__);return strtof(s,end); }
double MS s__strtod_l(const char *s,char **end,void *locale) { hit(__func__);return strtod_l(s,end,locale); }
int64_t MS s__strtoi64_l(const char *s,char **end,int radix,void *locale) { hit(__func__);return strtoll_l(s,end,radix,locale); }
uint64_t MS s__strtoui64_l(const char *s,char **end,int radix,void *locale) { hit(__func__);return strtoull_l(s,end,radix,locale); }
int MS s_isspace(int c) { hit(__func__);return isspace(c); }
int MS s_isxdigit(int c) { hit(__func__);return isxdigit(c); }
int MS s_tolower(int c) { hit(__func__);return tolower(c); }
int MS s_toupper(int c) { hit(__func__);return toupper(c); }
void *MS s_aligned_malloc(size_t n,size_t align) { void *p=0;hit(__func__);return posix_memalign(&p,align,n)?0:tracked(p,n); }
int MS s_rand(void) { hit(__func__);int32_t value=0;random_r(&current_context->random,&value);return value & 0x7fff; }
void MS s_srand(unsigned seed) { hit(__func__);srandom_r(seed,&current_context->random); }
double MS s_log10(double x) { hit(__func__);return log10(x); }
double MS s_tan(double x) { hit(__func__);return tan(x); }
double MS s_frexp(double x,int *e) { hit(__func__);return frexp(x,e); }
unsigned short *MS s___pctype_func(void) {
 unsigned short *table=current_context->ctype_table;
 hit(__func__);
 if(!current_context->ctype_ready) {
  for(unsigned i=0;i<256;++i) {
   unsigned short flags=0;
   if(isupper(i))flags|=1;
   if(islower(i))flags|=2;
   if(isdigit(i))flags|=4;
   if(isspace(i))flags|=8;
   if(ispunct(i))flags|=16;
   if(iscntrl(i))flags|=32;
   if(i==' ')flags|=64;
   if(isxdigit(i))flags|=128;
   if(isalpha(i))flags|=256;
   table[i+1]=flags;
  }
  current_context->ctype_ready=1;
 }
 return table+1;
}
void *MS s__create_locale(int category,const char *name) {
 hit(__func__);
 if(category!=0 || strcmp(name,"C")) { fputs("unsupported non-C locale\n",stderr);ultra_shim_fail("unsupported CRT adapter operation"); }
 return current_context->locale;
}
void MS s__free_locale(void *locale) { hit(__func__);if(locale!=current_context->locale)ultra_shim_fail("unknown locale handle"); }
int MS s__configthreadlocale(int flags) {
 int previous=current_context->locale_config;hit(__func__);
 if(flags==1 || flags==2)current_context->locale_config=flags;
 else if(flags!=0) { fputs("unsupported locale configuration\n",stderr);ultra_shim_fail("unsupported CRT adapter operation"); }
 return previous;
}
struct lconv *MS s_localeconv(void) { hit(__func__);return localeconv(); }
char *MS s_setlocale(int category,const char *name) {
 static char c_locale[]="C";hit(__func__);
 if(category<0 || category>5 || (name && strcmp(name,"C"))) { fputs("unsupported locale\n",stderr);ultra_shim_fail("unsupported CRT adapter operation"); }
 return c_locale;
}
typedef int (MS *ExitCallback)(void);
typedef struct ExitTable { ExitCallback *first,*last,*end; } ExitTable;
int MS s__initialize_onexit_table(ExitTable *table) { hit(__func__);memset(table,0,sizeof(*table));return 0; }
int MS s__register_onexit_function(ExitTable *table,ExitCallback callback) {
 hit(__func__);size_t n=table->first?(size_t)(table->last-table->first):0;
 ExitCallback *items=s_realloc(table->first,(n+1)*sizeof(*items));
 if(!items)return -1;
 items[n]=callback;table->first=items;table->last=items+n+1;table->end=table->last;return 0;
}
int MS s__execute_onexit_table(ExitTable *table) {
 hit(__func__);while(table->last>table->first)(*--table->last)();
 s_free(table->first);memset(table,0,sizeof(*table));return 0;
}
int64_t MS s__time64(int64_t *out) { hit(__func__);int64_t value=time(0);if(out)*out=value;return value; }
void MS s_GetSystemTimeAsFileTime(uint64_t *out) {
 struct timespec now;clock_gettime(CLOCK_REALTIME,&now);hit(__func__);
 *out=116444736000000000ULL+now.tv_sec*10000000ULL+now.tv_nsec/100;
}
static char *native_format(const char *format) {
 char *result=malloc(strlen(format)+1);size_t written=0;
 for(size_t i=0;format[i];) {
  if(format[i]!='%') { result[written++]=format[i++];continue; }
  result[written++]=format[i++];
  if(format[i]=='%') { result[written++]=format[i++];continue; }
  size_t start=i;
  while(format[i] && !strchr("diouxXfFeEgGaAcspn[",format[i]))++i;
  size_t end=i;
  for(size_t j=start;j<end;++j) {
   if(format[j]=='l' && j+1==end && (j==start || format[j-1]!='l') && strchr("diouxXn",format[end]))continue;
   result[written++]=format[j];
  }
  if(format[i])result[written++]=format[i++];
 }
 result[written]=0;return result;
}
int MS s___stdio_common_vsprintf(uint64_t options,char *out,size_t capacity,const char *format,void *locale,char *windows_args) {
 (void)options;(void)locale;hit(__func__);
 // x86-64 SysV overflow arguments and Windows va_list both use 8-byte slots.
 // This spike only accepts numeric/narrow C-locale formatting.
 if(strstr(format,"%S") || strstr(format,"%ls") || strstr(format,"%lc") || strstr(format,"%L")) {
  fputs("unsupported wide/long-double format\n",stderr);ultra_shim_fail("unsupported CRT adapter operation");
 }
 struct { unsigned gp_offset,fp_offset;void *overflow_arg_area,*reg_save_area; } layout={48,304,windows_args,0};
 va_list args;_Static_assert(sizeof(args)==sizeof(layout),"x86-64 SysV va_list required");
 char *converted=native_format(format);
 memcpy(args,&layout,sizeof(layout));int result=vsnprintf(out,capacity,converted,args);va_end(args);free(converted);return result;
}
int MS s___stdio_common_vsscanf(uint64_t options,const char *in,size_t count,const char *format,void *locale,char *windows_args) {
 (void)options;(void)locale;hit(__func__);
 if(strstr(format,"%S") || strstr(format,"%ls") || strstr(format,"%lc") || strstr(format,"%L")) {
  fputs("unsupported wide/long-double scan\n",stderr);ultra_shim_fail("unsupported CRT adapter operation");
 }
 struct { unsigned gp_offset,fp_offset;void *overflow_arg_area,*reg_save_area; } layout={48,304,windows_args,0};
 va_list args;memcpy(args,&layout,sizeof(layout));
 char *converted=native_format(format);
 char *copy=strndup(in,count);int result=vsscanf(copy,converted,args);free(copy);free(converted);va_end(args);return result;
}
FILE *MS s___acrt_iob_func(unsigned index) {
 hit(__func__);if(index==0)return stdin;if(index==1)return stdout;if(index==2)return stderr;
 fputs("unsupported stdio stream\n",stderr);ultra_shim_fail("unsupported CRT adapter operation");
}
int MS s___stdio_common_vfprintf(uint64_t options,FILE *out,const char *format,void *locale,char *windows_args) {
 (void)options;(void)locale;hit(__func__);
 struct { unsigned gp_offset,fp_offset;void *overflow_arg_area,*reg_save_area; } layout={48,304,windows_args,0};
 char *converted=native_format(format);
 va_list args;memcpy(args,&layout,sizeof(layout));int result=vfprintf(out,converted,args);va_end(args);free(converted);return result;
}
size_t MS s_fwrite(const void *p,size_t size,size_t count,FILE *out) { hit(__func__);return fwrite(p,size,count,out); }
int MS s_fflush(FILE *out) { hit(__func__);return fflush(out); }
int MS s_fputc(int c,FILE *out) { hit(__func__);return fputc(c,out); }
struct Lock { void *address; pthread_mutex_t mutex; pthread_cond_t condition; struct Lock *next; };
#define locks (current_context->locks)
static pthread_mutex_t locks_guard=PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t *lock_for(void *address) {
 pthread_mutex_lock(&locks_guard);
 Lock *item=locks;
 while(item && item->address!=address)item=item->next;
 if(!item) {
  item=calloc(1,sizeof(*item));item->address=address;item->next=locks;locks=item;
  pthread_mutexattr_t attr;pthread_mutexattr_init(&attr);
  pthread_mutexattr_settype(&attr,PTHREAD_MUTEX_RECURSIVE);
  pthread_mutex_init(&item->mutex,&attr);pthread_mutexattr_destroy(&attr);
  pthread_cond_init(&item->condition,0);
 }
 pthread_mutex_unlock(&locks_guard);return &item->mutex;
}
void MS s_AcquireSRWLockExclusive(void *lock) { hit(__func__);pthread_mutex_lock(lock_for(lock)); }
void MS s_ReleaseSRWLockExclusive(void *lock) { hit(__func__);pthread_mutex_unlock(lock_for(lock)); }
void MS s_InitializeCriticalSection(void *lock) { hit(__func__);lock_for(lock); }
void MS s_EnterCriticalSection(void *lock) { s_AcquireSRWLockExclusive(lock); }
void MS s_LeaveCriticalSection(void *lock) { s_ReleaseSRWLockExclusive(lock); }
void MS s_WakeAllConditionVariable(void *condition) {
 hit(__func__);pthread_mutex_t *unused=lock_for(condition);(void)unused;
 for(Lock *item=locks;item;item=item->next)if(item->address==condition)pthread_cond_broadcast(&item->condition);
}
void MS s_DeleteCriticalSection(void *lock) {
 hit(__func__);pthread_mutex_lock(&locks_guard);Lock **item=&locks;
 while(*item && (*item)->address!=lock)item=&(*item)->next;
 if(*item) { Lock *old=*item;*item=old->next;pthread_mutex_destroy(&old->mutex);free(old); }
 pthread_mutex_unlock(&locks_guard);
}

void ultra_shim_set_unsupported(void *opaque,unsigned i,const char *name){ShimContext *context=opaque;if(i<1024)context->unsupported_names[i]=strdup(name);}
void ultra_shim_unsupported(unsigned i){ultra_shim_fail(i<1024&&current_context->unsupported_names[i]?current_context->unsupported_names[i]:"unsupported DLL import");}
void ultra_shim_context_destroy(void *opaque){
 ShimContext *context=opaque;if(!context)return;
 while(context->allocations){Allocation *a=context->allocations;context->allocations=a->next;free(a->pointer);free(a);}
 for(unsigned i=0;i<1024;++i)free(context->unsupported_names[i]);
 #undef locks
 while(context->locks){Lock *item=context->locks;context->locks=item->next;pthread_cond_destroy(&item->condition);pthread_mutex_destroy(&item->mutex);free(item);}
 #define locks (current_context->locks)
 if(context->locale)freelocale(context->locale);
 free(context);
}
int ultra_shim_call(void *context,void *pointer,const uintptr_t arguments[8],uintptr_t *result) {
 typedef uintptr_t (MS *Fn)(uintptr_t,uintptr_t,uintptr_t,uintptr_t,uintptr_t,uintptr_t,uintptr_t,uintptr_t);
 current_context=context;
 locale_t previous=uselocale(current_context->locale);
 if(setjmp(boundary)){uselocale(previous);return 0;}
 *result=((Fn)pointer)(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6],arguments[7]);uselocale(previous);return 1;
}
int ultra_shim_parameter(void *context,void *pointer,void *instance,int64_t index,float value){
 typedef void (MS *Fn)(void *,int64_t,float);
 current_context=context;
 locale_t previous=uselocale(current_context->locale);
 if(setjmp(boundary)){uselocale(previous);return 0;}
 ((Fn)pointer)(instance,index,value);uselocale(previous);return 1;
}
void *ultra_shim_resolve(const char *name){
 if(!strcmp(name,"malloc"))return (void *)&s_malloc;
 if(!strcmp(name,"calloc"))return (void *)&s_calloc;
 if(!strcmp(name,"realloc"))return (void *)&s_realloc;
 if(!strcmp(name,"free"))return (void *)&s_free;
 if(!strcmp(name,"memcpy"))return (void *)&s_memcpy;
 if(!strcmp(name,"memmove"))return (void *)&s_memmove;
 if(!strcmp(name,"memset"))return (void *)&s_memset;
 if(!strcmp(name,"memcmp"))return (void *)&s_memcmp;
 if(!strcmp(name,"memchr"))return (void *)&s_memchr;
 if(!strcmp(name,"strlen"))return (void *)&s_strlen;
 if(!strcmp(name,"strcmp"))return (void *)&s_strcmp;
 if(!strcmp(name,"strncmp"))return (void *)&s_strncmp;
 if(!strcmp(name,"strcpy"))return (void *)&s_strcpy;
 if(!strcmp(name,"_strdup"))return (void *)&s__strdup;
 if(!strcmp(name,"_errno"))return (void *)&s__errno;
 if(!strcmp(name,"atof"))return (void *)&s_atof;
 if(!strcmp(name,"atoi"))return (void *)&s_atoi;
 if(!strcmp(name,"strtof"))return (void *)&s_strtof;
 if(!strcmp(name,"_strtod_l"))return (void *)&s__strtod_l;
 if(!strcmp(name,"_strtoi64_l"))return (void *)&s__strtoi64_l;
 if(!strcmp(name,"_strtoui64_l"))return (void *)&s__strtoui64_l;
 if(!strcmp(name,"isspace"))return (void *)&s_isspace;
 if(!strcmp(name,"isxdigit"))return (void *)&s_isxdigit;
 if(!strcmp(name,"tolower"))return (void *)&s_tolower;
 if(!strcmp(name,"toupper"))return (void *)&s_toupper;
 if(!strcmp(name,"aligned_malloc"))return (void *)&s_aligned_malloc;
 if(!strcmp(name,"rand"))return (void *)&s_rand;
 if(!strcmp(name,"srand"))return (void *)&s_srand;
 if(!strcmp(name,"log10"))return (void *)&s_log10;
 if(!strcmp(name,"tan"))return (void *)&s_tan;
 if(!strcmp(name,"frexp"))return (void *)&s_frexp;
 if(!strcmp(name,"__pctype_func"))return (void *)&s___pctype_func;
 if(!strcmp(name,"_create_locale"))return (void *)&s__create_locale;
 if(!strcmp(name,"_free_locale"))return (void *)&s__free_locale;
 if(!strcmp(name,"_configthreadlocale"))return (void *)&s__configthreadlocale;
 if(!strcmp(name,"localeconv"))return (void *)&s_localeconv;
 if(!strcmp(name,"setlocale"))return (void *)&s_setlocale;
 if(!strcmp(name,"_initialize_onexit_table"))return (void *)&s__initialize_onexit_table;
 if(!strcmp(name,"_register_onexit_function"))return (void *)&s__register_onexit_function;
 if(!strcmp(name,"_execute_onexit_table"))return (void *)&s__execute_onexit_table;
 if(!strcmp(name,"_time64"))return (void *)&s__time64;
 if(!strcmp(name,"GetSystemTimeAsFileTime"))return (void *)&s_GetSystemTimeAsFileTime;
 if(!strcmp(name,"__stdio_common_vsprintf"))return (void *)&s___stdio_common_vsprintf;
 if(!strcmp(name,"__stdio_common_vsscanf"))return (void *)&s___stdio_common_vsscanf;
 if(!strcmp(name,"__acrt_iob_func"))return (void *)&s___acrt_iob_func;
 if(!strcmp(name,"__stdio_common_vfprintf"))return (void *)&s___stdio_common_vfprintf;
 if(!strcmp(name,"fwrite"))return (void *)&s_fwrite;
 if(!strcmp(name,"fflush"))return (void *)&s_fflush;
 if(!strcmp(name,"fputc"))return (void *)&s_fputc;
 if(!strcmp(name,"AcquireSRWLockExclusive"))return (void *)&s_AcquireSRWLockExclusive;
 if(!strcmp(name,"ReleaseSRWLockExclusive"))return (void *)&s_ReleaseSRWLockExclusive;
 if(!strcmp(name,"InitializeCriticalSection"))return (void *)&s_InitializeCriticalSection;
 if(!strcmp(name,"EnterCriticalSection"))return (void *)&s_EnterCriticalSection;
 if(!strcmp(name,"LeaveCriticalSection"))return (void *)&s_LeaveCriticalSection;
 if(!strcmp(name,"WakeAllConditionVariable"))return (void *)&s_WakeAllConditionVariable;
 if(!strcmp(name,"DeleteCriticalSection"))return (void *)&s_DeleteCriticalSection;
 if(!strcmp(name,"_aligned_malloc"))return (void *)&s_aligned_malloc;
 if(!strcmp(name,"_aligned_free"))return (void *)&s_free;
 return 0;
}
#endif
