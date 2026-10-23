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
    "rect": [
      100,
      80,
      900,
      650
    ],
    "openinpresentation": 0,
    "default_fontsize": 12.0,
    "default_fontface": 0,
    "default_fontname": "Arial",
    "boxes": [
      {
        "box": {
          "id": "b",
          "maxclass": "button",
          "patching_rect": [
            80,
            80,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "t",
          "maxclass": "toggle",
          "patching_rect": [
            200,
            80,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "m",
          "maxclass": "message",
          "patching_rect": [
            80,
            150,
            65,
            22
          ],
          "text": "60 100"
        }
      },
      {
        "box": {
          "id": "i",
          "maxclass": "number",
          "patching_rect": [
            80,
            220,
            55,
            22
          ]
        }
      },
      {
        "box": {
          "id": "f",
          "maxclass": "flonum",
          "patching_rect": [
            200,
            220,
            65,
            22
          ]
        }
      },
      {
        "box": {
          "id": "a",
          "maxclass": "newobj",
          "patching_rect": [
            80,
            300,
            45,
            22
          ],
          "text": "+ 2"
        }
      },
      {
        "box": {
          "id": "clock",
          "maxclass": "newobj",
          "patching_rect": [
            200,
            150,
            70,
            22
          ],
          "text": "metro 150"
        }
      },
      {
        "box": {
          "id": "osc",
          "maxclass": "newobj",
          "patching_rect": [
            380,
            80,
            80,
            22
          ],
          "text": "cycle~ 440"
        }
      },
      {
        "box": {
          "id": "mul",
          "maxclass": "newobj",
          "patching_rect": [
            380,
            150,
            60,
            22
          ],
          "text": "*~ 0.1"
        }
      },
      {
        "box": {
          "id": "g",
          "maxclass": "gain~",
          "patching_rect": [
            380,
            220,
            32,
            110
          ]
        }
      },
      {
        "box": {
          "id": "dac",
          "maxclass": "newobj",
          "patching_rect": [
            380,
            390,
            45,
            22
          ],
          "text": "dac~"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "b",
            0
          ],
          "destination": [
            "m",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "m",
            0
          ],
          "destination": [
            "i",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "i",
            0
          ],
          "destination": [
            "a",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "a",
            0
          ],
          "destination": [
            "f",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "t",
            0
          ],
          "destination": [
            "clock",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "clock",
            0
          ],
          "destination": [
            "b",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "osc",
            0
          ],
          "destination": [
            "mul",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "mul",
            0
          ],
          "destination": [
            "g",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "g",
            0
          ],
          "destination": [
            "dac",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "g",
            0
          ],
          "destination": [
            "dac",
            1
          ]
        }
      }
    ]
  }
}
