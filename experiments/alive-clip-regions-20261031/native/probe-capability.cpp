#include "alive_session.hpp"
#include <cstdio>
int main(){AliveSessionConfigV4 c{};c.profile=1;c.track_count=1;c.device_count=2;c.source_count=1;c.slot_count=2;c.placement_count=1;c.tempo_bpm=120;c.length_frames=384000;c.loop_enabled=1;c.loop_end=192000;c.tracks[0].kind=1;c.tracks[0].instrument=0;c.tracks[0].effect_count=1;c.tracks[0].effects[0]=1;c.tracks[0].placement_count=1;
c.devices[0].parameter_count=7;
c.devices[1].parameter_count=1;
c.event_count=c.sources[0].event_count=22;c.sources[0].kind=1;c.sources[0].length_frames=192000;
c.events[0]={0,0,1,1,0,0.7};
c.events[1]={0,0,1,0,1,1800.0};
c.events[2]={0,0,1,0,3,70.0};
c.events[3]={0,0,2,0,60,76};
c.events[4]={0,0,2,0,64,76};
c.events[5]={36000,0,0,0,60,0};
c.events[6]={36000,0,0,0,64,0};
c.events[7]={48000,0,2,0,65,76};
c.events[8]={48000,0,2,0,69,76};
c.events[9]={84000,0,0,0,65,0};
c.events[10]={84000,0,0,0,69,0};
c.events[11]={96000,0,1,1,0,0.9};
c.events[12]={96000,0,1,0,1,3200.0};
c.events[13]={96000,0,1,0,3,90.0};
c.events[14]={96000,0,2,0,67,76};
c.events[15]={96000,0,2,0,71,76};
c.events[16]={132000,0,0,0,67,0};
c.events[17]={132000,0,0,0,71,0};
c.events[18]={144000,0,2,0,60,76};
c.events[19]={144000,0,2,0,64,76};
c.events[20]={180000,0,0,0,60,0};
c.events[21]={180000,0,0,0,64,0};
c.slots[0]={0,0,1,0,0,192000,0,192000};c.slots[1]=c.slots[0];c.placements[0]={0,0,1,0,0,192000,0,192000,0,192000};
for(int changed=0;changed<2;++changed){if(changed){c.slots[0].loop_start=48000;c.slots[0].loop_end=144000;}for(bool q:{false,true}){auto p=std::make_unique<ultra::workspace_admission::Proof>();bool ok=ultra::workspace_admission::build_validated(c,*p,q);auto&d=p->diagnostic;std::printf("changed=%d fine=%d ok=%d error=%u resource=%u width=%u observed=%llu cap=%llu\n",changed,q,ok,d.error,d.resource,d.window_frames,(unsigned long long)d.observed,(unsigned long long)d.limit);}}}