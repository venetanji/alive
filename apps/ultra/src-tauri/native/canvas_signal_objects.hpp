#pragma once
#include "canvas_message.hpp"
#include <array>
#include <cmath>

namespace ultra {
inline bool canvas_signal_kind(unsigned kind)noexcept{return kind>=Sig&&kind<=SignalDac;}
inline bool canvas_control_port(unsigned type)noexcept{return type==1||type==4;}
inline bool canvas_signal_port(unsigned type)noexcept{return type==2||type==3||type==4;}
inline bool canvas_ports_match(unsigned output,unsigned input)noexcept{
 return output==1?canvas_control_port(input):output==3?input==3:output==2?(input==2||input==4):output==4&&(input==1||input==2||input==4);
}
inline bool canvas_signal_args(const UltraCanvasNode& node,CanvasMessage& args)noexcept{
 if(!canvas_parse_args(node.text,args)||!args.count||!canvas_numeric_message(args))return false;
 if(node.kind==SignalDac)for(unsigned i=0;i<args.count;i++)if(!canvas_range(args.values[i],1,2,true))return false;
 return true;
}
inline double canvas_wrap_phase(double phase)noexcept{return phase-std::floor(phase);}
inline double canvas_safe_signal(double value)noexcept{return std::isfinite(value)?value:0.;}
inline const std::array<double,16385> canvas_cosine_table=[](){
 std::array<double,16385> table{};
 for(unsigned i=0;i<table.size();i++)table[i]=std::cos(6.283185307179586476925286766559*double(i)/16384.);
 return table;
}();
inline double canvas_cosine(double phase)noexcept{
 const double index=canvas_wrap_phase(phase)*16384.;const auto whole=unsigned(index);
 return canvas_cosine_table[whole]+(canvas_cosine_table[whole+1]-canvas_cosine_table[whole])*(index-whole);
}
}
