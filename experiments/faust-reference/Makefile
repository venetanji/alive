CXX ?= g++
CXXFLAGS ?= -O2 -std=c++17 -Wall -Wextra
# LeakSanitizer cannot run in the ptraced cloud sandbox. On a local host use:
# make sanitize SANITIZER_OPTIONS=detect_leaks=1
SANITIZER_OPTIONS ?= detect_leaks=0
CPPFLAGS += -isystem .deps/faust-2.88.0/architecture
.PHONY: setup test sanitize clean
setup:
	bash setup.sh
probe: test.cpp host.hpp generated/voice.hpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) test.cpp -o $@
test: probe
	./probe
sanitize:
	$(CXX) $(CPPFLAGS) -std=c++17 -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer test.cpp -o probe-sanitize
	ASAN_OPTIONS=$(SANITIZER_OPTIONS) ./probe-sanitize
clean:
	rm -f probe probe-sanitize
