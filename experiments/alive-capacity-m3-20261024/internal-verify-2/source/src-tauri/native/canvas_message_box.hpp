#pragma once
#include "canvas_message.hpp"

namespace ultra {
struct CanvasMessageTemplate {
 CanvasMessage prototype{};
 std::array<uint32_t,8> placeholders{};
 bool empty=true;
};
inline unsigned canvas_placeholder(const char* token)noexcept {
 return token[0]=='$'&&(token[1]=='1'||token[1]=='2')&&!token[2]?unsigned(token[1]-'0'):0;
}
inline bool canvas_message_template(const char* text,CanvasMessageTemplate& result)noexcept {
 if(!text)return false;
 char clean[128]{};unsigned length=0;
 while(length<128&&text[length]){const unsigned char c=text[length];if((c<32&&!canvas_space(char(c)))||c>126)return false;++length;}
 if(length==128)return false;
 char words[9][128]{};unsigned count=0;const char* p=text;
 while(*p){while(canvas_space(*p))++p;if(!*p)break;if(count==9)return false;unsigned n=0;while(*p&&!canvas_space(*p))words[count][n++]=*p++;++count;}
 CanvasMessageTemplate next{};if(!count){result=next;return true;}
 if(canvas_placeholder(words[0]))return false;
 CanvasMessage first{};if(!canvas_parse_atom(words[0],first,0))return false;
 const bool selector=first.tags[0]==2;
 unsigned at=0;
 for(unsigned i=0;i<count;++i){
  const auto ref=canvas_placeholder(words[i]);
  if(ref&&(!i||!std::strcmp(words[0],"symbol")||!std::strcmp(words[0],"bang")))return false;
  if(i)clean[at++]=' ';
  const char* word=ref?"0":words[i];const auto n=std::strlen(word);std::memcpy(clean+at,word,n);at+=n;
  if(ref){const auto index=i-unsigned(selector);if(index>=8)return false;next.placeholders[index]=ref;}
 }
 if(!canvas_parse_message(clean,next.prototype))return false;
 next.empty=false;result=next;return true;
}
// Dollar atoms are admitted only into a replacement consumed by MessageBox.
inline bool canvas_message_replacement_valid(const CanvasMessage& input)noexcept {
 if(input.count>8||!canvas_symbol(input.selector))return false;
 for(unsigned i=0;i<input.count;++i)if(input.tags[i]>2||!canvas_number(input.values[i])||(!canvas_symbol(input.symbols[i])&&!(input.tags[i]==2&&canvas_placeholder(input.symbols[i]))))return false;
 return true;
}
inline bool canvas_message_replacement(const CanvasMessage& input,bool set,CanvasMessageTemplate& result)noexcept {
 if(!canvas_message_replacement_valid(input))return false;
 CanvasMessageTemplate next{};next.prototype=input;
 if(set){
  next.prototype.selector[0]=0;
  if(!input.count){result=next;return true;}
  if(input.tags[0]==2){
   if(canvas_placeholder(input.symbols[0]))return false;
   canvas_copy_symbol(next.prototype.selector,input.symbols[0]);next.prototype.count=input.count-1;
   for(unsigned i=0;i<next.prototype.count;++i)canvas_store_atom(next.prototype,i,input,i+1);
  }
 }
 auto& m=next.prototype;
 if(canvas_named(m,"bang")){if(m.count)return false;m={};}
 if(canvas_named(m,"symbol")&&(m.count!=1||m.tags[0]!=2||canvas_placeholder(m.symbols[0])))return false;
 if(canvas_named(m,"list")){
  if(!m.count)return false;
  if(m.tags[0]!=2)m.selector[0]=0;
 }
 for(unsigned i=0;i<m.count;++i)if(m.tags[i]==2){
  const unsigned ref=canvas_placeholder(m.symbols[i]);
  if(ref){if(!m.selector[0]&&!i)return false;next.placeholders[i]=ref;m.tags[i]=0;m.values[i]=0;std::memset(m.symbols[i],0,32);}
 }
 next.empty=false;result=next;return true;
}
struct CanvasMessageBoxState {
 CanvasMessageTemplate content{};
 CanvasMessage arguments=canvas_scalar(0);
 uint64_t generation=1;
 void replace(const CanvasMessageTemplate& next,bool authored=false)noexcept {
  content=next;++generation;
  // Clear and authoring edits start a fresh substitution context (local policy).
  if(next.empty||authored){arguments={};arguments.count=2;}
 }
 bool input(const CanvasMessage& message,unsigned inlet,CanvasMessage& output,bool& emit)noexcept {
  emit=false;
  if(inlet||canvas_named(message,"set")){
   if(inlet&&canvas_named(message,"set"))return false;
   CanvasMessageTemplate next{};if(!canvas_message_replacement(message,!inlet,next))return false;
   replace(next);return true;
  }
  if(canvas_named(message,"append")||canvas_named(message,"prepend")||canvas_named(message,"setargs"))return false;
  if(content.empty)return true;
  if(!canvas_bang(message)){
   const auto atoms=canvas_atoms(message,false);
   for(unsigned i=0;i<std::min(2u,atoms.count);++i)canvas_store_atom(arguments,i,atoms,i);
  }
  output=content.prototype;
  for(unsigned i=0;i<output.count;++i)if(content.placeholders[i])canvas_store_atom(output,i,arguments,content.placeholders[i]-1);
  emit=true;return true;
 }
};
}
