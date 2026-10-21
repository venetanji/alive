#include "apps/ultra/src-tauri/native/patch_graph.hpp"
#include <cstring>
#include <iomanip>
#include <iostream>
#include <string>

// Research transport for original fixtures, independent of Rust IPC preparation.
int main() {
  using namespace ultra;
  UltraCanvasGraph graph{};
  if (!(std::cin >> graph.revision >> graph.node_count >> graph.edge_count) ||
      graph.node_count > 32 || graph.edge_count > 64) return 2;
  for (unsigned i = 0; i < graph.node_count; ++i) {
    auto& node = graph.nodes[i];
    std::string text;
    if (!(std::cin >> node.id >> node.kind >> node.p0 >> node.p1 >> node.p2 >>
          node.p3 >> node.p4 >> std::quoted(text)) || text.size() > 127) return 3;
    std::memcpy(node.text, text.c_str(), text.size() + 1);
  }
  for (unsigned i = 0; i < graph.edge_count; ++i) {
    auto& edge = graph.edges[i];
    if (!(std::cin >> edge.from >> edge.outlet >> edge.to >> edge.inlet)) return 4;
  }
  CanvasPlan plan{};
  if (!compile_canvas(graph, plan)) return 5;
  CanvasRuntime runtime;
  runtime.reset(plan);
  auto discard = [](alive::Event) { return true; };
  unsigned operations = 0;
  if (!(std::cin >> operations) || operations > 64) return 6;
  std::cout << std::setprecision(17) << '[';
  for (unsigned step = 0; step < operations; ++step) {
    std::string operation;
    if (!(std::cin >> operation)) return 7;
    runtime.begin_callback();
    if (operation == "event") {
      unsigned node = 0, inlet = 0;
      std::string literal;
      CanvasMessage message{};
      if (!(std::cin >> node >> inlet >> std::quoted(literal)) ||
          !canvas_parse_message(literal.c_str(), message) ||
          !runtime.event(graph.revision, node, inlet, message, 0, discard)) return 8;
    } else if (operation == "advance") {
      unsigned frames = 0;
      if (!(std::cin >> frames) || frames > 480000) return 9;
      for (unsigned frame = 0; frame < frames; ++frame) {
        if (frame % 64 == 0) runtime.begin_callback();
        if (!runtime.sample(frame % 64, discard)) return 10;
      }
    } else return 11;
    if (step) std::cout << ',';
    std::cout << "{\"step\":" << step << ",\"nodes\":[";
    for (unsigned i = 0; i < graph.node_count; ++i) {
      if (i) std::cout << ',';
      const auto& message = runtime.last_message(i);
      std::cout << "{\"id\":" << graph.nodes[i].id
                << ",\"value\":" << runtime.value(i)
                << ",\"pulses\":" << runtime.pulses(i)
                << ",\"selector\":" << std::quoted(message.selector)
                << ",\"atoms\":[";
      for (unsigned atom = 0; atom < message.count; ++atom) {
        if (atom) std::cout << ',';
        std::cout << "{\"tag\":" << message.tags[atom] << ",\"value\":";
        if (message.tags[atom] == 2) std::cout << std::quoted(message.symbols[atom]);
        else std::cout << message.values[atom];
        std::cout << '}';
      }
      std::cout << "]}";
    }
    std::cout << "]}";
  }
  std::cout << "]\n";
}
