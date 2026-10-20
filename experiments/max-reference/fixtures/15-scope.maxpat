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
      1020.0,
      850.0
    ],
    "openinpresentation": 0,
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "comment",
          "patching_rect": [
            20.0,
            10.0,
            880.0,
            40.0
          ],
          "text": "Named send crosses nested patchers; #0 in two abstraction instances isolates local buses"
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "newobj",
          "patching_rect": [
            210.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "s alive_reference_global"
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "r alive_reference_global"
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "newobj",
          "patching_rect": [
            590.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "p nested",
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
              1020.0,
              850.0
            ],
            "openinpresentation": 0,
            "boxes": [
              {
                "box": {
                  "id": "obj-1",
                  "maxclass": "comment",
                  "patching_rect": [
                    20.0,
                    10.0,
                    880.0,
                    40.0
                  ],
                  "text": "Nested named receive"
                }
              },
              {
                "box": {
                  "id": "obj-2",
                  "maxclass": "newobj",
                  "patching_rect": [
                    210.0,
                    70.0,
                    175.0,
                    22.0
                  ],
                  "text": "r alive_reference_global"
                }
              },
              {
                "box": {
                  "id": "obj-3",
                  "maxclass": "newobj",
                  "patching_rect": [
                    400.0,
                    70.0,
                    175.0,
                    22.0
                  ],
                  "text": "outlet"
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "obj-2",
                    0
                  ],
                  "destination": [
                    "obj-3",
                    0
                  ]
                }
              }
            ]
          }
        }
      },
      {
        "box": {
          "id": "obj-5",
          "maxclass": "newobj",
          "patching_rect": [
            780.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "scoped-bus"
        }
      },
      {
        "box": {
          "id": "obj-6",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "scoped-bus"
        }
      },
      {
        "box": {
          "id": "obj-7",
          "maxclass": "message",
          "patching_rect": [
            210.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "41",
          "varname": "event_0"
        }
      },
      {
        "box": {
          "id": "obj-8",
          "maxclass": "message",
          "patching_rect": [
            400.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "7",
          "varname": "event_1"
        }
      },
      {
        "box": {
          "id": "obj-9",
          "maxclass": "message",
          "patching_rect": [
            590.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "8",
          "varname": "event_2"
        }
      },
      {
        "box": {
          "id": "logger",
          "maxclass": "newobj",
          "text": "js probe.js 15-scope",
          "varname": "logger",
          "numinlets": 64,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            770.0,
            500.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-11",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "thispatcher",
          "varname": "saver"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "obj-3",
            0
          ],
          "destination": [
            "logger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-4",
            0
          ],
          "destination": [
            "logger",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-5",
            0
          ],
          "destination": [
            "logger",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-6",
            0
          ],
          "destination": [
            "logger",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-7",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-8",
            0
          ],
          "destination": [
            "obj-5",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-9",
            0
          ],
          "destination": [
            "obj-6",
            0
          ]
        }
      }
    ]
  }
}
