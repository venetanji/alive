#include "../src-tauri/native/canvas_message.hpp"
#include <cassert>
#include <cmath>
#include <limits>
#include <cstdio>

int main() {
 struct Case {const char* text; double value; unsigned tag;};
 const Case cases[]={{"0",0,0},{"-0",-0.0,0},{"+12",12,0},{"1.25",1.25,1},
  {".5",.5,1},{"-1.5e2",-150,1},{"100000",100000,0},
  {"1e-308",1e-308,1},{"4.9406564584124654e-324",std::numeric_limits<double>::denorm_min(),1},
  {"1e-999",0,1},{"-1e-999",-0.0,1},{"0e999",0,1}};
 for(const auto& c:cases){ultra::CanvasMessage out{};
  assert(ultra::canvas_parse_atom(c.text,out,0));assert(out.values[0]==c.value);
  assert(std::signbit(out.values[0])==std::signbit(c.value));assert(out.tags[0]==c.tag);}
 for(const char* text:{"1e999","100001","nan","inf","-inf","1,2","1e","1e+",".","+","--1","0x1p2"}){
  ultra::CanvasMessage out{};assert(!ultra::canvas_parse_atom(text,out,0));}
 ultra::CanvasMessage out{};assert(ultra::canvas_parse_message("set 1.25 -1e-999 label",out));
 assert(out.count==3&&out.tags[0]==1&&std::signbit(out.values[1])&&out.tags[2]==2);
 std::puts("Portable bounded numeric parser passed");
}
