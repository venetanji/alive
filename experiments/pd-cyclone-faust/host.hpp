#pragma once
#include "z_libpd.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <fstream>
#include <stdexcept>
#include <string>
#include <vector>
using Audio=std::array<float,192>;
inline void require(bool b,const char*m){if(!b)throw std::runtime_error(m);}
inline std::vector<std::string> trace;
inline std::string atoms(int n,t_atom*a){std::string s;for(int i=0;i<n;++i){if(i)s+=",";if(libpd_is_float(a+i))s+="f:"+std::to_string(libpd_get_float(a+i));else if(libpd_is_symbol(a+i))s+="s:"+std::string(libpd_get_symbol(a+i));else s+="unsupported";}return s;}
inline void initialize(){libpd_init();require(libpd_blocksize()==64,"64-frame tick required");}
struct Device {
 t_pdinstance* instance=nullptr;void* patch=nullptr;std::vector<void*> bindings;
 explicit Device(const std::string&path){instance=libpd_new_instance();require(instance,"instance");select();
  libpd_set_printhook([](const char*s){fprintf(stderr,"%s",s);});
  libpd_set_banghook([](const char*r){trace.push_back(std::string(r)+":bang");});
  libpd_set_floathook([](const char*r,float f){trace.push_back(std::string(r)+":float:"+std::to_string(f));});
  libpd_set_symbolhook([](const char*r,const char*s){trace.push_back(std::string(r)+":symbol:"+s);});
  libpd_set_listhook([](const char*r,int n,t_atom*a){trace.push_back(std::string(r)+":list:"+atoms(n,a));});
  libpd_set_messagehook([](const char*r,const char*s,int n,t_atom*a){trace.push_back(std::string(r)+":anything:"+s+":"+atoms(n,a));});
  libpd_add_to_search_path((path+"/build/externals").c_str());
  require(libpd_init_audio(1,3,48000)==0,"audio init");
  patch=libpd_openfile("voice.pd",path.c_str());require(patch,"open patch");
  for(auto name:{"gate1","gate2","inside","outside","left","right"})bindings.push_back(libpd_bind(name));
  libpd_start_message(1);libpd_add_float(1);require(libpd_finish_message("pd","dsp")==0,"dsp");
 }
 void select(){libpd_set_instance(instance);}
 void param(const char*name,float v){select();libpd_start_message(1);libpd_add_float(v);require(libpd_finish_message("control",name)==0,"parameter receiver");}
 void reset(){select();require(libpd_message("control","reset",0,nullptr)==0,"reset");}
 Audio tick(const std::array<float,64>&input={}){select();Audio out{};require(libpd_process_float(1,input.data(),out.data())==0,"process");return out;}
 void testMessages(){select();trace.clear();libpd_bang("gate_data");require(trace.empty(),"closed gate emitted");
  libpd_float("gate_select",1);libpd_bang("gate_data");libpd_float("gate_data",3.5);libpd_symbol("gate_data","hello");
  libpd_start_message(2);libpd_add_float(2);libpd_add_symbol("two");libpd_finish_list("gate_data");
  libpd_start_message(1);libpd_add_float(7);libpd_finish_message("gate_data","custom");
  libpd_float("gate_select",2);libpd_float("gate_data",9);
  libpd_float("split_data",3.75);libpd_float("split_data",10.5);libpd_float("split_data",-1.5);libpd_bang("order");
  std::vector<std::string> expected={"gate1:bang","gate1:float:3.500000","gate1:symbol:hello","gate1:list:f:2.000000,s:two","gate1:anything:custom:f:7.000000","gate2:float:9.000000","inside:float:3.000000","outside:float:10.000000","outside:float:-1.000000","right:bang","left:bang"};
  for(auto&s:trace)fprintf(stderr,"TRACE %s\n",s.c_str());require(trace==expected,"typed/order trace mismatch");
  std::ofstream f("build/dispatch-trace.txt");for(auto&s:trace)f<<s<<'\n';
 }
 ~Device(){select();for(void*b:bindings)libpd_unbind(b);if(patch)libpd_closefile(patch);libpd_free_instance(instance);}
 Device(const Device&)=delete;
};
struct HostEvent {int frame;const char*name;float value;};
// Fixed score is prepared OFFLINE. This constrains ingress, not arbitrary Pd graphs.
struct Score {
 std::array<HostEvent,256> entries{};int size=0,next=0;bool failed=false,pendingReset=false;
 void fail(){failed=true;pendingReset=true;next=size;}
 bool push(HostEvent e){if(failed)return false;bool valid=std::isfinite(e.value)&&e.frame>=0&&e.frame<=48000*10&&(size==0||entries[size-1].frame<=e.frame);
  bool freq=std::strcmp(e.name,"freq")==0,unit=std::strcmp(e.name,"gain")==0||std::strcmp(e.name,"level")==0||std::strcmp(e.name,"gate")==0;
  valid=valid&&(freq?(e.value>=20&&e.value<=20000):(unit&&e.value>=0&&e.value<=1));
  if(!valid||size==256){fail();return false;}entries[size++]=e;return true;
 }
 void apply(Device&d,int frame){int end=next;while(!failed&&end<size&&entries[end].frame<=frame&&end-next<17)++end;if(end-next>16)fail();
  if(pendingReset){d.reset();pendingReset=false;}if(failed)return;while(next<end){auto e=entries[next++];d.param(e.name,e.value);}
 }
};
