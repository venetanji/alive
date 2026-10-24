#pragma once
#include "canvas_message.hpp"

namespace ultra {
inline CanvasMessage canvas_coerce_atom(const CanvasMessage& input,unsigned at,unsigned tag) noexcept {
 CanvasMessage result{};result.count=1;result.tags[0]=tag;
 if(tag==2){if(input.tags[at]==2)canvas_copy_symbol(result.symbols[0],input.symbols[at]);}
 else if(input.tags[at]!=2)result.values[0]=tag==0?std::trunc(input.values[at]):input.values[at];
 return result;
}
inline CanvasMessage canvas_sequence_message(const CanvasMessage& stored) noexcept {
 CanvasMessage result=stored;
 if(stored.count&&stored.tags[0]==2&&stored.symbols[0][0]){
  result={};canvas_copy_symbol(result.selector,stored.symbols[0]);result.count=stored.count-1;
  for(unsigned i=0;i<result.count;i++)canvas_store_atom(result,i,stored,i+1);
 }else if(stored.count>1)canvas_copy_symbol(result.selector,"list");
 return result;
}
inline bool canvas_atom_matches(const CanvasMessage& selectors,unsigned at,const CanvasMessage& input,bool truncate=false) noexcept {
 if(!input.count)return false;
 if(selectors.tags[at]==2)return input.tags[0]==2&&!std::strcmp(selectors.symbols[at],input.symbols[0]);
 if(input.tags[0]==2)return false;
 return selectors.values[at]==(truncate&&selectors.tags[at]==0?std::trunc(input.values[0]):input.values[0]);
}
inline unsigned canvas_trigger_format(const char* symbol) noexcept {
 if(!std::strcmp(symbol,"i")||!std::strcmp(symbol,"int"))return 1;
 if(!std::strcmp(symbol,"f")||!std::strcmp(symbol,"float"))return 2;
 if(!std::strcmp(symbol,"b")||!std::strcmp(symbol,"bang"))return 3;
 if(!std::strcmp(symbol,"l")||!std::strcmp(symbol,"list"))return 4;
 if(!std::strcmp(symbol,"s")||!std::strcmp(symbol,"symbol"))return 5;
 return 0;
}
inline CanvasMessage canvas_trigger_message(const CanvasMessage& args,unsigned at,const CanvasMessage& message) noexcept {
 if(args.tags[at]!=2)return canvas_atom(args,at);
 const unsigned format=canvas_trigger_format(args.symbols[at]);
 if(!format)return canvas_atom(args,at);
 if(format==3)return {};
 const bool numeric=canvas_numeric_message(message)&&message.count==1;
 if(format==1||format==2)return canvas_scalar(numeric?(format==1?std::trunc(message.values[0]):message.values[0]):0,format-1);
 if(format==4){if(canvas_bang(message))return canvas_scalar(0);return canvas_atoms(message,false);}
 CanvasMessage result{};
 if(canvas_named(message,"symbol")&&message.count==1)canvas_copy_symbol(result.selector,message.symbols[0]);
 else if(message.selector[0]&&std::strcmp(message.selector,"list"))canvas_copy_symbol(result.selector,message.selector);
 else {result.count=1;result.tags[0]=2;canvas_copy_symbol(result.selector,"symbol");}
 return result;
}
}
