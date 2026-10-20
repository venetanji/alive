// Portable deterministic checks for the actual callback sequencer, not a second score.
#include "../src-tauri/native/sequence.hpp"
#include <cassert>
#include <cstdio>
#include <vector>
#include <tuple>
using Record=std::tuple<uint64_t,unsigned,unsigned,unsigned>;
using ultra::Sequencer;using ultra::SequenceConfig;
static SequenceConfig config(){return {1,123,60,0,8,50,100,0,0};}
static std::vector<Record> score(const std::vector<unsigned>& partitions,unsigned total){
 Sequencer sequence;auto c=config();std::vector<Record> events;uint64_t base=0;
 auto emit=[&](alive::Event e){events.emplace_back(base+e.offset,unsigned(e.kind),e.note,e.value);return true;};
 sequence.configure(c,emit);
 for(unsigned block=0;base<total;block++){auto n=std::min<unsigned>(partitions[block%partitions.size()],total-base);for(unsigned i=0;i<n;i++)sequence.sample(i,emit);base+=n;}
 return events;
}
int main(){
 auto a=score({64},1000000),b=score({1,7,31,128,511,1024},1000000);assert(a==b);
 unsigned on=0;const int notes[]={60,64,67,72,76,79,84,88};
 for(auto [frame,kind,note,value]:a)if(kind==unsigned(alive::Kind::On)){
  assert(note==unsigned(notes[on%8]));assert(frame==(uint64_t(on)*2880000+491)/492);assert(value==100);++on;
 }
 assert(on>150);
 // Off must occur before the next note; gate is measured in the same rational phase.
 for(size_t i=0;i+2<a.size();i+=2){assert(std::get<1>(a[i])==0);assert(std::get<1>(a[i+1])==1);assert(std::get<0>(a[i+1])<std::get<0>(a[i+2]));}
 Sequencer seq;auto c=config();std::vector<alive::Event> events;auto emit=[&](alive::Event e){events.push_back(e);return true;};
 seq.configure(c,emit);seq.sample(0,emit);assert(seq.armed()&&seq.note()==60&&seq.ticks()==1);
 seq.stop(1,emit);auto size=events.size();for(unsigned i=0;i<20000;i++)seq.sample(i%1024,emit);assert(events.size()==size&&!seq.armed()&&seq.note()==128);
 c.chord=1;c.transpose=-24;seq.configure(c,emit);seq.sample(0,emit);assert(seq.note()==36);
 c.chord=2;c.root=84;c.transpose=24;c.steps=8;seq.configure(c,emit);for(unsigned i=0;i<47000;i++)seq.sample(i%1024,emit);for(auto e:events)assert(e.note<=127);
 // MIDI mode does not free-run. Start waits for a clock; six clocks advance a step.
 c=config();c.clock_source=1;seq.configure(c,emit);size=events.size();for(unsigned i=0;i<50000;i++)seq.sample(i%1024,emit);assert(events.size()==size&&seq.armed());
 seq.midi(0xfa,0,emit);assert(seq.ticks()==0);seq.midi(0xf8,0,emit);assert(seq.note()==60&&seq.ticks()==1);
 for(unsigned pulse=1;pulse<=6;pulse++){for(unsigned i=0;i<1000;i++)seq.sample(i%1024,emit);seq.midi(0xf8,0,emit);}
 assert(seq.note()==64&&seq.ticks()==2);seq.midi(0xfc,0,emit);assert(seq.armed()&&seq.note()==128);size=events.size();for(unsigned i=0;i<20;i++)seq.midi(0xf8,0,emit);assert(events.size()==size);
 seq.midi(0xfb,0,emit);seq.midi(0xf8,0,emit);assert(seq.note()==67);seq.midi(0xfa,0,emit);seq.midi(0xf8,0,emit);assert(seq.note()==60&&seq.ticks()==1);
 // A disconnected clock cannot leave a sequenced gate held forever.
 for(unsigned i=0;i<50000;i++){seq.sample(i%1024,emit);}assert(seq.note()==128);
 // A rejected event stops and disarms immediately, rather than retrying forever.
 seq.stop(0,emit);c.clock_source=0;seq.configure(c,emit);auto reject=[](alive::Event){return false;};seq.sample(0,reject);assert(!seq.armed()&&seq.note()==128);
 c=config();assert(ultra::valid_sequence(c));c.bpm=0;assert(!ultra::valid_sequence(c));c=config();c.steps=9;assert(!ultra::valid_sequence(c));c=config();c.transpose=25;assert(!ultra::valid_sequence(c));
 std::puts("PASS: native sequencer chord maths, million-frame partition invariance, rational metro, gate/stop/reconfigure, MIDI Start/Continue/Stop/clock, clock-loss release and rejection safety");
}
