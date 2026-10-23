#pragma once
#include "patch_graph.h"
#include <array>
#include <algorithm>
#include "vendor/fast_float/fast_float.h"
#include <cmath>
#include <cstring>

namespace ultra {
enum CanvasKind : unsigned {
 Bang,Message,Number,Toggle,Add,Multiply,Metro,Counter,Chord,MakeNote,MidiIn,Voice,Gain,Join,Dac,
 Int,Float,Flonum,Slider,Pack,Unpack,Select,Route,Trigger,Line,Print,Send,Receive,
 Iter,Prepend,Append,ZlReg,ZlJoin,ZlLen,ZlIter,ZlSlice,ZlRev,ZlRot,
 Sig,SignalAdd,SignalSubtract,SignalMultiply,SignalDivide,Cycle,Phasor,Noise,SignalClip,LineSignal,Snapshot,SignalDac,
 Inlet,Outlet,NumberInt,MessageBox,
 Subtract,Divide,Modulo,ReverseSubtract,ReverseDivide,Abs,
 PolyNote,SawVoice,FilterVoice,AdsrVoice,MultiplyVoice,MixVoice
};
struct CanvasMessage {
 uint32_t count=0;
 std::array<double,8> values{};
 std::array<uint32_t,8> tags{};
 char symbols[8][32]{};
 char selector[32]{};
};
inline bool canvas_number(double v) noexcept {return std::isfinite(v)&&v>=-100000&&v<=100000;}
inline bool canvas_range(double v,double lo,double hi,bool integer=false) noexcept {return std::isfinite(v)&&v>=lo&&v<=hi&&(!integer||std::floor(v)==v);}
inline bool canvas_space(char c) noexcept {return c==' '||c=='\t'||c=='\n'||c=='\r';}
inline bool canvas_text(const char* text,unsigned capacity,bool empty=true) noexcept {
 if(!text)return false;
 for(unsigned i=0;i<capacity;i++){
  const auto c=static_cast<unsigned char>(text[i]);
  if(!c)return empty||i!=0;
  if((c<32&&!canvas_space(char(c)))||c>126||c==','||c==';'||c=='$'||c=='"'||c=='\''||c=='\\')return false;
 }
 return false;
}
inline bool canvas_symbol(const char* text,bool empty=true) noexcept {
 if(!canvas_text(text,32,empty))return false;
 for(unsigned i=0;text[i];i++)if(canvas_space(text[i]))return false;
 return true;
}
inline void canvas_copy_symbol(char* destination,const char* text) noexcept {
 std::memset(destination,0,32);const auto n=std::min<std::size_t>(31,std::strlen(text));std::memcpy(destination,text,n);
}
inline CanvasMessage canvas_message_from_pod(const UltraCanvasMessage& source) noexcept {
 CanvasMessage result{};result.count=source.count;
 for(unsigned i=0;i<8;i++){result.values[i]=source.values[i];result.tags[i]=source.tags[i];std::memcpy(result.symbols[i],source.symbols[i],32);}
 std::memcpy(result.selector,source.selector,32);return result;
}
inline UltraCanvasMessage canvas_message_to_pod(const CanvasMessage& source) noexcept {
 UltraCanvasMessage result{};result.count=source.count;
 for(unsigned i=0;i<8;i++){result.values[i]=source.values[i];result.tags[i]=source.tags[i];std::memcpy(result.symbols[i],source.symbols[i],32);}
 std::memcpy(result.selector,source.selector,32);return result;
}
inline bool canvas_message_valid(const CanvasMessage& message) noexcept {
 if(message.count>8||!canvas_symbol(message.selector))return false;
 for(unsigned i=0;i<message.count;i++){
  if(message.tags[i]>2||!canvas_number(message.values[i])||!canvas_symbol(message.symbols[i]))return false;
  // Old numeric callers do not provide tags; fractional numeric values remain valid.
 }
 return true;
}
inline bool canvas_parse_atom(const char* token,CanvasMessage& result,unsigned index) noexcept {
 if(!canvas_text(token,128,false)||index>=8)return false;
 const char* begin=token;const char* end=token+std::strlen(token);
 const bool numeric=(*begin>='0'&&*begin<='9')||*begin=='+'||*begin=='-'||*begin=='.';
 if(numeric){
  const char* p=begin;if(*p=='+'||*p=='-')++p;
  unsigned digits=0;while(*p>='0'&&*p<='9'){++digits;++p;}
  if(*p=='.'){++p;while(*p>='0'&&*p<='9'){++digits;++p;}}
  if(!digits)return false;
  if(*p=='e'||*p=='E'){
   ++p;if(*p=='+'||*p=='-')++p;
   unsigned exponent_digits=0;while(*p>='0'&&*p<='9'){++exponent_digits;++p;}if(!exponent_digits)return false;
  }
  if(*p)return false;
  if(*begin=='+')++begin;
  // Locale-independent and allocation-free on libstdc++, libc++ and MSVC.
  // libc++ lacks long-double from_chars and gates double parsing on macOS 26.
  double value=0;const auto parsed=fast_float::from_chars(begin,end,value,fast_float::chars_format::general);
  if(parsed.ptr!=end)return false;
  if(parsed.ec==std::errc::result_out_of_range){
   // fast_float writes correctly signed zero on underflow and infinity on
   // overflow. Preserve bounded underflow acceptance; never admit overflow.
   if(value!=0)return false;
  }else if(parsed.ec!=std::errc{})return false;
  if(!canvas_number(value))return false;
  result.values[index]=value;result.tags[index]=std::strpbrk(token,".eE")?1:0;return true;
 }
 if(!canvas_symbol(token,false))return false;
 char lower[32]{};for(unsigned i=0;token[i];i++)lower[i]=token[i]>='A'&&token[i]<='Z'?char(token[i]+('a'-'A')):token[i];
 if(!std::strcmp(lower,"nan")||!std::strcmp(lower,"inf")||!std::strcmp(lower,"infinity"))return false;
 result.tags[index]=2;canvas_copy_symbol(result.symbols[index],token);return true;
}
inline bool canvas_parse_args(const char* text,CanvasMessage& result) noexcept {
 if(!canvas_text(text,128))return false;
 CanvasMessage parsed{};const char* p=text;
 while(*p){
  while(canvas_space(*p))++p;
  if(!*p)break;
  char atom[128]{};unsigned length=0;
  while(*p&&!canvas_space(*p)){if(length==127)return false;atom[length++]=*p++;}
  if(parsed.count==8||!canvas_parse_atom(atom,parsed,parsed.count))return false;
  ++parsed.count;
 }
 result=parsed;return true;
}
inline bool canvas_parse_message(const char* text,CanvasMessage& result) noexcept {
 if(!canvas_text(text,128))return false;
 char tokens[9][128]{};unsigned count=0;const char* p=text;
 while(*p){
  while(canvas_space(*p))++p;
  if(!*p)break;
  if(count==9)return false;
  unsigned length=0;
  while(*p&&!canvas_space(*p)){if(length==127)return false;tokens[count][length++]=*p++;}
  ++count;
 }
 if(!count){result={};return true;}
 CanvasMessage first{};if(!canvas_parse_atom(tokens[0],first,0))return false;
 const bool selector=first.tags[0]==2;
 if(!selector&&count>8)return false;
 CanvasMessage parsed{};
 if(selector){
  canvas_copy_symbol(parsed.selector,tokens[0]);
  if(!std::strcmp(tokens[0],"bang")){if(count!=1)return false;result={};return true;}
  if(!std::strcmp(tokens[0],"symbol")){
   if(count!=2||!canvas_symbol(tokens[1],false))return false;
   parsed.count=1;parsed.tags[0]=2;canvas_copy_symbol(parsed.symbols[0],tokens[1]);result=parsed;return true;
  }
 }
 parsed.count=count-unsigned(selector);
 for(unsigned i=0;i<parsed.count;i++)if(!canvas_parse_atom(tokens[i+unsigned(selector)],parsed,i))return false;
 result=parsed;return true;
}
inline CanvasMessage canvas_scalar(double value,unsigned tag=0) noexcept {
 CanvasMessage result{};result.count=1;result.values[0]=value;result.tags[0]=tag;return result;
}
inline CanvasMessage canvas_atom(const CanvasMessage& message,unsigned index) noexcept {
 CanvasMessage result{};result.count=1;result.values[0]=message.values[index];result.tags[0]=message.tags[index];
 canvas_copy_symbol(result.symbols[0],message.symbols[index]);
 if(result.tags[0]==2){if(result.symbols[0][0]){result.count=0;canvas_copy_symbol(result.selector,result.symbols[0]);}else canvas_copy_symbol(result.selector,"symbol");}
 return result;
}
inline void canvas_store_atom(CanvasMessage& destination,unsigned index,const CanvasMessage& source,unsigned at) noexcept {
 destination.values[index]=source.values[at];destination.tags[index]=source.tags[at];canvas_copy_symbol(destination.symbols[index],source.symbols[at]);
}
inline CanvasMessage canvas_atoms(const CanvasMessage& message,bool include_symbol_selector=true) noexcept {
 CanvasMessage result=message;result.selector[0]=0;
 if(message.selector[0]&&std::strcmp(message.selector,"list")&&(include_symbol_selector||std::strcmp(message.selector,"symbol"))){
  result={};result.count=std::min(8u,message.count+1);result.tags[0]=2;canvas_copy_symbol(result.symbols[0],message.selector);
  for(unsigned i=1;i<result.count;i++)canvas_store_atom(result,i,message,i-1);
 }
 return result;
}
inline bool canvas_creation_args(const UltraCanvasNode& node,CanvasMessage& result) noexcept {
 const char* text=node.text;
 if(!text[0])text=node.kind==Pack||node.kind==Unpack?"0 0":node.kind==Trigger?"i i":"0";
 if(!canvas_parse_args(text,result)||!result.count)return false;
 if(node.kind==Pack||node.kind==Unpack)for(unsigned i=0;i<result.count;i++){
  if(result.tags[i]==2&&(!std::strcmp(result.symbols[i],"i")||!std::strcmp(result.symbols[i],"f"))){
   result.tags[i]=result.symbols[i][0]=='f'?1:0;result.values[i]=0;result.symbols[i][0]=0;
  }
 }
 return true;
}
inline bool canvas_numeric_message(const CanvasMessage& message) noexcept {
 if(message.selector[0]&&std::strcmp(message.selector,"list"))return false;
 for(unsigned i=0;i<message.count;i++)if(message.tags[i]==2)return false;
 return true;
}
inline bool canvas_bang(const CanvasMessage& message) noexcept {return !message.count&&!message.selector[0];}
inline bool canvas_named(const CanvasMessage& message,const char* name) noexcept {return std::strcmp(message.selector,name)==0;}
}

