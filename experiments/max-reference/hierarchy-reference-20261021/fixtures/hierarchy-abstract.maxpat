{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 1,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      0.0,
      0.0,
      1000.0,
      800.0
    ],
    "boxes": [
      {
        "box": {
          "id": "scope",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            30.0,
            180.0,
            24.0
          ],
          "text": "loadmess abstract #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
        }
      },
      {
        "box": {
          "id": "out",
          "maxclass": "outlet",
          "patching_rect": [
            20.0,
            160.0,
            180.0,
            24.0
          ],
          "index": 1
        }
      },
      {
        "box": {
          "id": "embedded",
          "maxclass": "newobj",
          "patching_rect": [
            300.0,
            30.0,
            180.0,
            24.0
          ],
          "patcher": {
            "fileversion": 1,
            "appversion": {
              "major": 9,
              "minor": 1,
              "revision": 5,
              "architecture": "x64",
              "modernui": 1
            },
            "classnamespace": "box",
            "rect": [
              0.0,
              0.0,
              1000.0,
              800.0
            ],
            "boxes": [
              {
                "box": {
                  "id": "abstract-nested-load",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    100.0,
                    180.0,
                    24.0
                  ],
                  "text": "loadmess abstract-nested #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
                }
              },
              {
                "box": {
                  "id": "abstract-nested-send",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    140.0,
                    180.0,
                    24.0
                  ],
                  "text": "s alive-hierarchy-reference-20261021"
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "abstract-nested-load",
                    0
                  ],
                  "destination": [
                    "abstract-nested-send",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 0,
          "numoutlets": 0,
          "text": "p embedded childArg 99"
        }
      },
      {
        "box": {
          "id": "msg-bang",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            220.0,
            180.0,
            24.0
          ],
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "literal",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            260.0,
            180.0,
            24.0
          ],
          "text": "#0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
        }
      },
      {
        "box": {
          "id": "msg-tag",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend abstract-message"
        }
      },
      {
        "box": {
          "id": "msg-out",
          "maxclass": "outlet",
          "patching_rect": [
            20.0,
            350.0,
            180.0,
            24.0
          ],
          "index": 2
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "scope",
            0
          ],
          "destination": [
            "out",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "msg-bang",
            0
          ],
          "destination": [
            "literal",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "literal",
            0
          ],
          "destination": [
            "msg-tag",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "msg-tag",
            0
          ],
          "destination": [
            "msg-out",
            0
          ]
        }
      }
    ]
  }
}
