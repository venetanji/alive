// AOT generated Faust DSP in a real Pd external. Allocations only at stopped creation.
#include "m_pd.h"
#include "../faust-reference/host.hpp"
struct External {t_object object;Voice* voice;};
static t_class* voice_class;
static void* make(){auto*x=(External*)pd_new(voice_class);x->voice=nullptr;try{x->voice=new Voice;x->voice->prepare();}catch(...){pd_error(x,"alivevoice~: preparation failed");pd_free((t_pd*)x);return nullptr;}outlet_new(&x->object,&s_signal);return x;}
static void destroy(External*x){delete x->voice;}
static void freq(External*x,t_floatarg f){*x->voice->freq=f;}
static void gain(External*x,t_floatarg f){*x->voice->gain=f;}
static void gate(External*x,t_floatarg f){*x->voice->gate=f;}
static void level(External*x,t_floatarg f){*x->voice->level=f;}
static void reset(External*x){x->voice->reset();}
static t_int* perform(t_int*w){auto*x=(External*)w[1];float*out=(float*)w[3];x->voice->dsp.compute(int(w[2]),nullptr,&out);return w+4;}
static void dsp(External*x,t_signal**s){dsp_add(perform,3,x,s[0]->s_n,s[0]->s_vec);}
extern "C" void alivevoice_tilde_setup(){
 ReferenceVoice::classInit(48000);
 voice_class=class_new(gensym("alivevoice~"),(t_newmethod)make,(t_method)destroy,sizeof(External),CLASS_DEFAULT,A_NULL);
 class_addmethod(voice_class,(t_method)dsp,gensym("dsp"),A_CANT,A_NULL);
 class_addmethod(voice_class,(t_method)freq,gensym("freq"),A_FLOAT,A_NULL);
 class_addmethod(voice_class,(t_method)gain,gensym("gain"),A_FLOAT,A_NULL);
 class_addmethod(voice_class,(t_method)gate,gensym("gate"),A_FLOAT,A_NULL);
 class_addmethod(voice_class,(t_method)level,gensym("level"),A_FLOAT,A_NULL);
 class_addmethod(voice_class,(t_method)reset,gensym("reset"),A_NULL);
}
