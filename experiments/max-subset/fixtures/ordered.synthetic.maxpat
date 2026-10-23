{
  "patcher": {
    "boxes": [
      {"box": {"id": "a", "maxclass": "button", "numinlets": 1, "numoutlets": 1, "patching_rect": [10, 20, 24, 24]}},
      {"box": {"id": "b", "maxclass": "newobj", "text": "t b i", "numinlets": 1, "numoutlets": 2, "presentation": 1, "presentation_rect": [30, 40, 50, 22]}}
    ],
    "lines": [
      {"patchline": {"source": ["a", 0], "destination": ["b", 0], "order": 1}},
      {"patchline": {"source": ["b", 1], "destination": ["a", 0], "order": 0}}
    ]
  }
}
