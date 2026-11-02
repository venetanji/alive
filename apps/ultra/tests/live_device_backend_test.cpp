#include "../src-tauri/native/external_device/live_device.h"
#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/canvas_message.hpp"
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>

namespace {
constexpr const char* Hash="4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133";
UltraCanvasGraph graph(unsigned revision,unsigned id=1){
 UltraCanvasGraph g{};g.revision=revision;g.node_count=2;g.edge_count=2;
 g.nodes[0].id=id;g.nodes[0].kind=68;g.nodes[1].id=id+1;g.nodes[1].kind=ultra::SignalDac;
 std::strcpy(g.nodes[1].text,"1 2");g.edges[0]={id,0,id+1,0};g.edges[1]={id,1,id+1,1};return g;
}
float initial(unsigned index,const UltraExternalParameter& d){
 switch(index){
  case 0:return 4;case 1:return 1.f/6;
  case 2:case 45:case 128:return .65f;
  case 3:case 30:case 113:return 3;
  case 4:case 31:case 114:return 12;
  case 5:case 11:case 26:case 34:case 36:case 71:case 82:case 117:case 119:case 154:case 165:return .5f;
  case 7:case 28:case 46:case 65:case 87:case 99:case 129:case 148:case 170:case 182:
  case 52:case 135:case 96:case 97:case 108:case 109:case 179:case 180:case 191:case 192:return 1;
  case 68:case 151:return .7f;case 98:case 110:case 181:case 193:return .2f;case 121:return 1;
  default:return d.minimum;
 }
}
double render(unsigned blocks){
 std::array<float,256> l{},r{};double energy=0;
 for(unsigned b=0;b<blocks;++b){assert(ultra_external_render(l.size(),l.data(),r.data()));for(unsigned i=0;i<l.size();++i){assert(std::isfinite(l[i])&&std::isfinite(r[i]));energy+=l[i]*l[i]+r[i]*r[i];}}
 return energy;
}
}
int main(int argc,char** argv){
 assert(argc==2);char error[512]{};
 auto* device=ultra_external_device_open(argv[1],Hash,error,sizeof error);if(!device){std::fprintf(stderr,"%s\n",error);return 1;}
 std::array<float,203> values{};
 for(unsigned p=0;p<values.size();++p){UltraExternalParameter d{};assert(ultra_external_device_parameter(device,p,&d));values[p]=initial(p,d);}
 ultra_external_device_close(device);
 auto first=graph(1),second=graph(1,3);
 UltraLiveDeviceSource a{1,1,203,0,"live12-analog-v1",argv[1],values.data()},b=a;b.node=3;
 assert(!ultra_canvas_install_document(0,&first)); // An owned source cannot be omitted.
 assert(ultra_canvas_install_live_devices_document(0,&first,&a,1,error,sizeof error));
 assert(ultra_canvas_install_live_devices_document(1,&second,&b,1,error,sizeof error));
 assert(ultra_canvas_live_devices_count_document(0)==1&&ultra_canvas_live_devices_count_document(1)==1);
 std::array<UltraLiveDeviceParameterState,203> state{};
 assert(ultra_canvas_live_device_parameters_document(0,1,1,state.data(),state.size())==203);
 assert(!ultra_canvas_live_device_parameters_document(0,2,1,state.data(),state.size()));
 assert(ultra_external_start());assert(render(8)==0);
 const double note[2]={60,100};assert(ultra_canvas_event_document(0,1,1,0,2,note));assert(render(12)>0);
 // Failed live installation preserves both admitted documents and their source state.
 first.revision=2;assert(!ultra_canvas_install_live_devices_document(0,&first,&a,1,error,sizeof error));
 assert(!ultra_canvas_close_document(0));
 auto changed=values;changed[1]=0;
 UltraLiveDeviceStateUpdate update{1,203,changed.data()};
 assert(!ultra_canvas_live_devices_set_states_document(0,2,&update,1,error,sizeof error));
 assert(ultra_canvas_live_devices_set_states_document(0,1,&update,1,error,sizeof error));
 assert(ultra_canvas_live_device_parameters_document(0,1,1,state.data(),state.size())==203&&state[1].requested==0);
 render(1);assert(ultra_canvas_live_device_parameters_document(0,1,1,state.data(),state.size())==203&&state[1].applied==0);
 assert(ultra_canvas_stop_document(0));assert(render(4)==0);
 ultra_audio_stop();assert(ultra_canvas_live_devices_rearm_document(0,error,sizeof error));
 assert(ultra_canvas_close_document(0));assert(ultra_canvas_live_devices_count_document(0)==0);
 assert(ultra_canvas_live_devices_count_document(1)==1);
 assert(ultra_external_start());assert(render(4)==0);
 assert(ultra_canvas_event_document(1,1,3,0,2,note));assert(render(12)>0);
 ultra_audio_stop();assert(ultra_canvas_close_document(1));
 std::puts("PASS: owned Analog sources install transactionally, edit live, stop/rearm, and close independently across ordinary Ultra documents");
}
