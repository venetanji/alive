#pragma once
#include "canvas_objects.hpp"

namespace ultra {
inline bool canvas_list_kind(unsigned kind) noexcept {return kind>=Iter&&kind<=ZlRot;}
inline const char* canvas_list_name(unsigned kind) noexcept {
 static constexpr const char* names[]={"iter","prepend","append","zl.reg","zl.join","zl.len","zl.iter","zl.slice","zl.rev","zl.rot"};
 return canvas_list_kind(kind)?names[kind-Iter]:"list";
}
// Selectors other than list are list data for these objects. Unlike the
// older coercion helper, this conversion refuses a ninth atom before copying.
inline bool canvas_list_atoms(const CanvasMessage& input,CanvasMessage& output) noexcept {
 const bool selector=input.selector[0]&&std::strcmp(input.selector,"list");
 if(input.count+unsigned(selector)>8)return false;
 CanvasMessage result{};result.count=input.count+unsigned(selector);
 if(selector){result.tags[0]=2;canvas_copy_symbol(result.symbols[0],input.selector);}
 for(unsigned i=0;i<input.count;i++)canvas_store_atom(result,i+unsigned(selector),input,i);
 output=result;return true;
}
inline bool canvas_list_join(const CanvasMessage& left,const CanvasMessage& right,CanvasMessage& output) noexcept {
 if(left.count+right.count>8)return false;
 CanvasMessage result=left;result.selector[0]=0;result.count+=right.count;
 for(unsigned i=0;i<right.count;i++)canvas_store_atom(result,i+left.count,right,i);
 output=result;return true;
}
inline bool canvas_affix_message(const CanvasMessage& retained,const CanvasMessage& input,bool prepend,CanvasMessage& output) noexcept {
 if(!retained.count){output=input;return true;}
 if(!prepend){
  if(input.count+retained.count>8)return false;
  CanvasMessage result=input;result.count+=retained.count;
  for(unsigned i=0;i<retained.count;i++)canvas_store_atom(result,i+input.count,retained,i);
  if(!result.selector[0]&&result.count>1)canvas_copy_symbol(result.selector,"list");
  output=result;return true;
 }
 const bool selector=input.selector[0]&&std::strcmp(input.selector,"list");
 const unsigned incoming=input.count+unsigned(selector),total=retained.count+incoming;
 auto atom=[&](unsigned index,CanvasMessage& destination,unsigned at){
  const bool stored=prepend?index<retained.count:index>=incoming;
  if(stored){canvas_store_atom(destination,at,retained,prepend?index:index-incoming);return;}
  index-=prepend?retained.count:0;
  if(selector&&!index){destination.tags[at]=2;canvas_copy_symbol(destination.symbols[at],input.selector);}
  else canvas_store_atom(destination,at,input,index-unsigned(selector));
 };
 CanvasMessage first{};if(total)atom(0,first,0);
 const bool headed=total&&first.tags[0]==2&&first.symbols[0][0];
 if(total-unsigned(headed)>8)return false;
 CanvasMessage result{};result.count=total-unsigned(headed);
 if(headed)canvas_copy_symbol(result.selector,first.symbols[0]);
 else if(total>1)canvas_copy_symbol(result.selector,"list");
 for(unsigned i=0;i<result.count;i++)atom(i+unsigned(headed),result,i);
 output=result;return true;
}
inline CanvasMessage canvas_list_range(const CanvasMessage& input,unsigned start,unsigned count) noexcept {
 CanvasMessage result{};result.count=std::min(count,input.count-std::min(start,input.count));
 for(unsigned i=0;i<result.count;i++)canvas_store_atom(result,i,input,start+i);
 return result;
}
inline double canvas_list_parameter(const CanvasMessage& input) noexcept {
 return input.count&&input.tags[0]!=2&&(!input.selector[0]||canvas_named(input,"list"))?input.values[0]:0;
}
}
