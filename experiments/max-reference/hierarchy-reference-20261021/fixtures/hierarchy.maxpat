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
          "id": "collector",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            30.0,
            180.0,
            24.0
          ],
          "varname": "collector",
          "text": "js collector.js"
        }
      },
      {
        "box": {
          "id": "bus",
          "maxclass": "newobj",
          "patching_rect": [
            250.0,
            30.0,
            180.0,
            24.0
          ],
          "text": "r alive-hierarchy-reference-20261021"
        }
      },
      {
        "box": {
          "id": "root-load-load",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            100.0,
            180.0,
            24.0
          ],
          "text": "loadmess root-load #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
        }
      },
      {
        "box": {
          "id": "root-load-send",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            140.0,
            180.0,
            24.0
          ],
          "text": "s alive-hierarchy-reference-20261021"
        }
      },
      {
        "box": {
          "id": "scope-embedded",
          "maxclass": "newobj",
          "patching_rect": [
            500.0,
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
                  "id": "root-nested-load",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    100.0,
                    180.0,
                    24.0
                  ],
                  "text": "loadmess root-nested #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
                }
              },
              {
                "box": {
                  "id": "root-nested-send",
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
                    "root-nested-load",
                    0
                  ],
                  "destination": [
                    "root-nested-send",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 0,
          "numoutlets": 0,
          "text": "p scope ownArg 42"
        }
      },
      {
        "box": {
          "id": "abstract-0",
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            120.0,
            180.0,
            24.0
          ],
          "numinlets": 0,
          "numoutlets": 2,
          "text": "hierarchy-abstract 17 alpha"
        }
      },
      {
        "box": {
          "id": "abstract-tag-0-0",
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            180.0,
            180.0,
            24.0
          ],
          "text": "prepend abstract-0-out-0"
        }
      },
      {
        "box": {
          "id": "abstract-tag-0-1",
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            220.0,
            180.0,
            24.0
          ],
          "text": "prepend abstract-0-out-1"
        }
      },
      {
        "box": {
          "id": "abstract-1",
          "maxclass": "newobj",
          "patching_rect": [
            600.0,
            120.0,
            180.0,
            24.0
          ],
          "numinlets": 0,
          "numoutlets": 2,
          "text": "hierarchy-abstract 23 beta"
        }
      },
      {
        "box": {
          "id": "abstract-tag-1-0",
          "maxclass": "newobj",
          "patching_rect": [
            600.0,
            180.0,
            180.0,
            24.0
          ],
          "text": "prepend abstract-1-out-0"
        }
      },
      {
        "box": {
          "id": "abstract-tag-1-1",
          "maxclass": "newobj",
          "patching_rect": [
            600.0,
            220.0,
            180.0,
            24.0
          ],
          "text": "prepend abstract-1-out-1"
        }
      },
      {
        "box": {
          "id": "explicit",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            260.0,
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
                  "id": "in-A",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1,
                  "index": 2
                }
              },
              {
                "box": {
                  "id": "tag-A",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend explicit-A"
                }
              },
              {
                "box": {
                  "id": "out-A",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0,
                  "index": 2
                }
              },
              {
                "box": {
                  "id": "in-B",
                  "maxclass": "inlet",
                  "patching_rect": [
                    250.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1,
                  "index": 1
                }
              },
              {
                "box": {
                  "id": "tag-B",
                  "maxclass": "newobj",
                  "patching_rect": [
                    250.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend explicit-B"
                }
              },
              {
                "box": {
                  "id": "out-B",
                  "maxclass": "outlet",
                  "patching_rect": [
                    250.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0,
                  "index": 1
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "in-A",
                    0
                  ],
                  "destination": [
                    "tag-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-A",
                    0
                  ],
                  "destination": [
                    "out-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "in-B",
                    0
                  ],
                  "destination": [
                    "tag-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-B",
                    0
                  ],
                  "destination": [
                    "out-B",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 2,
          "text": "p explicit"
        }
      },
      {
        "box": {
          "id": "explicit-out-0",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend explicit-out-0"
        }
      },
      {
        "box": {
          "id": "explicit-out-1",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            330.0,
            180.0,
            24.0
          ],
          "text": "prepend explicit-out-1"
        }
      },
      {
        "box": {
          "id": "event-0",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            350.0,
            180.0,
            24.0
          ],
          "varname": "event-0",
          "text": "100"
        }
      },
      {
        "box": {
          "id": "event-1",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            353.0,
            180.0,
            24.0
          ],
          "varname": "event-1",
          "text": "101"
        }
      },
      {
        "box": {
          "id": "geometry",
          "maxclass": "newobj",
          "patching_rect": [
            200.0,
            260.0,
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
                  "id": "in-B",
                  "maxclass": "inlet",
                  "patching_rect": [
                    250.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-B",
                  "maxclass": "newobj",
                  "patching_rect": [
                    250.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend geometry-B"
                }
              },
              {
                "box": {
                  "id": "out-B",
                  "maxclass": "outlet",
                  "patching_rect": [
                    250.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              },
              {
                "box": {
                  "id": "in-A",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-A",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend geometry-A"
                }
              },
              {
                "box": {
                  "id": "out-A",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "in-B",
                    0
                  ],
                  "destination": [
                    "tag-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-B",
                    0
                  ],
                  "destination": [
                    "out-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "in-A",
                    0
                  ],
                  "destination": [
                    "tag-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-A",
                    0
                  ],
                  "destination": [
                    "out-A",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 2,
          "text": "p geometry"
        }
      },
      {
        "box": {
          "id": "geometry-out-0",
          "maxclass": "newobj",
          "patching_rect": [
            200.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend geometry-out-0"
        }
      },
      {
        "box": {
          "id": "geometry-out-1",
          "maxclass": "newobj",
          "patching_rect": [
            200.0,
            330.0,
            180.0,
            24.0
          ],
          "text": "prepend geometry-out-1"
        }
      },
      {
        "box": {
          "id": "event-2",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            356.0,
            180.0,
            24.0
          ],
          "varname": "event-2",
          "text": "110"
        }
      },
      {
        "box": {
          "id": "event-3",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            359.0,
            180.0,
            24.0
          ],
          "varname": "event-3",
          "text": "111"
        }
      },
      {
        "box": {
          "id": "tie-y",
          "maxclass": "newobj",
          "patching_rect": [
            380.0,
            260.0,
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
                  "id": "in-A",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    200.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-A",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    270.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-y-A"
                }
              },
              {
                "box": {
                  "id": "out-A",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    340.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              },
              {
                "box": {
                  "id": "in-B",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-B",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-y-B"
                }
              },
              {
                "box": {
                  "id": "out-B",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "in-A",
                    0
                  ],
                  "destination": [
                    "tag-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-A",
                    0
                  ],
                  "destination": [
                    "out-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "in-B",
                    0
                  ],
                  "destination": [
                    "tag-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-B",
                    0
                  ],
                  "destination": [
                    "out-B",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 2,
          "text": "p tie-y"
        }
      },
      {
        "box": {
          "id": "tie-y-out-0",
          "maxclass": "newobj",
          "patching_rect": [
            380.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-y-out-0"
        }
      },
      {
        "box": {
          "id": "tie-y-out-1",
          "maxclass": "newobj",
          "patching_rect": [
            380.0,
            330.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-y-out-1"
        }
      },
      {
        "box": {
          "id": "event-4",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            362.0,
            180.0,
            24.0
          ],
          "varname": "event-4",
          "text": "120"
        }
      },
      {
        "box": {
          "id": "event-5",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            365.0,
            180.0,
            24.0
          ],
          "varname": "event-5",
          "text": "121"
        }
      },
      {
        "box": {
          "id": "tie-array",
          "maxclass": "newobj",
          "patching_rect": [
            560.0,
            260.0,
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
                  "id": "in-A",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-A",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-array-A"
                }
              },
              {
                "box": {
                  "id": "out-A",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              },
              {
                "box": {
                  "id": "in-B",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-B",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-array-B"
                }
              },
              {
                "box": {
                  "id": "out-B",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "in-A",
                    0
                  ],
                  "destination": [
                    "tag-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-A",
                    0
                  ],
                  "destination": [
                    "out-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "in-B",
                    0
                  ],
                  "destination": [
                    "tag-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-B",
                    0
                  ],
                  "destination": [
                    "out-B",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 2,
          "text": "p tie-array"
        }
      },
      {
        "box": {
          "id": "tie-array-out-0",
          "maxclass": "newobj",
          "patching_rect": [
            560.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-array-out-0"
        }
      },
      {
        "box": {
          "id": "tie-array-out-1",
          "maxclass": "newobj",
          "patching_rect": [
            560.0,
            330.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-array-out-1"
        }
      },
      {
        "box": {
          "id": "event-6",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            368.0,
            180.0,
            24.0
          ],
          "varname": "event-6",
          "text": "130"
        }
      },
      {
        "box": {
          "id": "event-7",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            371.0,
            180.0,
            24.0
          ],
          "varname": "event-7",
          "text": "131"
        }
      },
      {
        "box": {
          "id": "tie-reversed",
          "maxclass": "newobj",
          "patching_rect": [
            740.0,
            260.0,
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
                  "id": "in-B",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-B",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-reversed-B"
                }
              },
              {
                "box": {
                  "id": "out-B",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              },
              {
                "box": {
                  "id": "in-A",
                  "maxclass": "inlet",
                  "patching_rect": [
                    50.0,
                    20.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 0,
                  "numoutlets": 1
                }
              },
              {
                "box": {
                  "id": "tag-A",
                  "maxclass": "newobj",
                  "patching_rect": [
                    50.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "prepend tie-reversed-A"
                }
              },
              {
                "box": {
                  "id": "out-A",
                  "maxclass": "outlet",
                  "patching_rect": [
                    50.0,
                    160.0,
                    180.0,
                    24.0
                  ],
                  "numinlets": 1,
                  "numoutlets": 0
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "in-B",
                    0
                  ],
                  "destination": [
                    "tag-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-B",
                    0
                  ],
                  "destination": [
                    "out-B",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "in-A",
                    0
                  ],
                  "destination": [
                    "tag-A",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "tag-A",
                    0
                  ],
                  "destination": [
                    "out-A",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 2,
          "text": "p tie-reversed"
        }
      },
      {
        "box": {
          "id": "tie-reversed-out-0",
          "maxclass": "newobj",
          "patching_rect": [
            740.0,
            300.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-reversed-out-0"
        }
      },
      {
        "box": {
          "id": "tie-reversed-out-1",
          "maxclass": "newobj",
          "patching_rect": [
            740.0,
            330.0,
            180.0,
            24.0
          ],
          "text": "prepend tie-reversed-out-1"
        }
      },
      {
        "box": {
          "id": "event-8",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            374.0,
            180.0,
            24.0
          ],
          "varname": "event-8",
          "text": "140"
        }
      },
      {
        "box": {
          "id": "event-9",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            377.0,
            180.0,
            24.0
          ],
          "varname": "event-9",
          "text": "141"
        }
      },
      {
        "box": {
          "id": "lifecycle",
          "maxclass": "newobj",
          "patching_rect": [
            500.0,
            450.0,
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
                  "id": "counter-in",
                  "maxclass": "inlet",
                  "patching_rect": [
                    20.0,
                    30.0,
                    180.0,
                    24.0
                  ],
                  "index": 1
                }
              },
              {
                "box": {
                  "id": "stored",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "int 3"
                }
              },
              {
                "box": {
                  "id": "counter-out",
                  "maxclass": "outlet",
                  "patching_rect": [
                    20.0,
                    150.0,
                    180.0,
                    24.0
                  ],
                  "index": 1
                }
              },
              {
                "box": {
                  "id": "patcher-in",
                  "maxclass": "inlet",
                  "patching_rect": [
                    300.0,
                    30.0,
                    180.0,
                    24.0
                  ],
                  "index": 2
                }
              },
              {
                "box": {
                  "id": "patcher",
                  "maxclass": "newobj",
                  "patching_rect": [
                    300.0,
                    90.0,
                    180.0,
                    24.0
                  ],
                  "text": "thispatcher"
                }
              },
              {
                "box": {
                  "id": "lifecycle-load-load",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    200.0,
                    180.0,
                    24.0
                  ],
                  "text": "loadmess lifecycle-load #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
                }
              },
              {
                "box": {
                  "id": "lifecycle-load-send",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20.0,
                    240.0,
                    180.0,
                    24.0
                  ],
                  "text": "s alive-hierarchy-reference-20261021"
                }
              },
              {
                "box": {
                  "id": "deep",
                  "maxclass": "newobj",
                  "patching_rect": [
                    450.0,
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
                          "id": "lifecycle-deep-load-load",
                          "maxclass": "newobj",
                          "patching_rect": [
                            20.0,
                            100.0,
                            180.0,
                            24.0
                          ],
                          "text": "loadmess lifecycle-deep-load #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1"
                        }
                      },
                      {
                        "box": {
                          "id": "lifecycle-deep-load-send",
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
                            "lifecycle-deep-load-load",
                            0
                          ],
                          "destination": [
                            "lifecycle-deep-load-send",
                            0
                          ]
                        }
                      }
                    ]
                  },
                  "numinlets": 0,
                  "numoutlets": 0,
                  "text": "p deep"
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "counter-in",
                    0
                  ],
                  "destination": [
                    "stored",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "stored",
                    0
                  ],
                  "destination": [
                    "counter-out",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "patcher-in",
                    0
                  ],
                  "destination": [
                    "patcher",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "lifecycle-load-load",
                    0
                  ],
                  "destination": [
                    "lifecycle-load-send",
                    0
                  ]
                }
              }
            ]
          },
          "numinlets": 2,
          "numoutlets": 1,
          "text": "p lifecycle"
        }
      },
      {
        "box": {
          "id": "lifecycle-tag",
          "maxclass": "newobj",
          "patching_rect": [
            500.0,
            500.0,
            180.0,
            24.0
          ],
          "text": "prepend lifecycle-value"
        }
      },
      {
        "box": {
          "id": "pcontrol",
          "maxclass": "newobj",
          "patching_rect": [
            700.0,
            400.0,
            180.0,
            24.0
          ],
          "text": "pcontrol"
        }
      },
      {
        "box": {
          "id": "event-10",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            380.0,
            180.0,
            24.0
          ],
          "varname": "event-10",
          "text": "77"
        }
      },
      {
        "box": {
          "id": "event-11",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            383.0,
            180.0,
            24.0
          ],
          "varname": "event-11",
          "text": "open"
        }
      },
      {
        "box": {
          "id": "event-12",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            386.0,
            180.0,
            24.0
          ],
          "varname": "event-12",
          "text": "close"
        }
      },
      {
        "box": {
          "id": "event-13",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            389.0,
            180.0,
            24.0
          ],
          "varname": "event-13",
          "text": "open"
        }
      },
      {
        "box": {
          "id": "event-14",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            392.0,
            180.0,
            24.0
          ],
          "varname": "event-14",
          "text": "bang"
        }
      },
      {
        "box": {
          "id": "event-15",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            395.0,
            180.0,
            24.0
          ],
          "varname": "event-15",
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "event-16",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            398.0,
            180.0,
            24.0
          ],
          "varname": "event-16",
          "text": "bang"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "bus",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "root-load-load",
            0
          ],
          "destination": [
            "root-load-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-0",
            0
          ],
          "destination": [
            "abstract-tag-0-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-tag-0-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-0",
            1
          ],
          "destination": [
            "abstract-tag-0-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-tag-0-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-1",
            0
          ],
          "destination": [
            "abstract-tag-1-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-tag-1-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-1",
            1
          ],
          "destination": [
            "abstract-tag-1-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "abstract-tag-1-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "explicit",
            0
          ],
          "destination": [
            "explicit-out-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "explicit-out-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "explicit",
            1
          ],
          "destination": [
            "explicit-out-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "explicit-out-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-0",
            0
          ],
          "destination": [
            "explicit",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-1",
            0
          ],
          "destination": [
            "explicit",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "geometry",
            0
          ],
          "destination": [
            "geometry-out-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "geometry-out-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "geometry",
            1
          ],
          "destination": [
            "geometry-out-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "geometry-out-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-2",
            0
          ],
          "destination": [
            "geometry",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-3",
            0
          ],
          "destination": [
            "geometry",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-y",
            0
          ],
          "destination": [
            "tie-y-out-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-y-out-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-y",
            1
          ],
          "destination": [
            "tie-y-out-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-y-out-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-4",
            0
          ],
          "destination": [
            "tie-y",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-5",
            0
          ],
          "destination": [
            "tie-y",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-array",
            0
          ],
          "destination": [
            "tie-array-out-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-array-out-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-array",
            1
          ],
          "destination": [
            "tie-array-out-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-array-out-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-6",
            0
          ],
          "destination": [
            "tie-array",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-7",
            0
          ],
          "destination": [
            "tie-array",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-reversed",
            0
          ],
          "destination": [
            "tie-reversed-out-0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-reversed-out-0",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-reversed",
            1
          ],
          "destination": [
            "tie-reversed-out-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tie-reversed-out-1",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-8",
            0
          ],
          "destination": [
            "tie-reversed",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-9",
            0
          ],
          "destination": [
            "tie-reversed",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "lifecycle",
            0
          ],
          "destination": [
            "lifecycle-tag",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "lifecycle-tag",
            0
          ],
          "destination": [
            "collector",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pcontrol",
            0
          ],
          "destination": [
            "lifecycle",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-10",
            0
          ],
          "destination": [
            "lifecycle",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-11",
            0
          ],
          "destination": [
            "pcontrol",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-12",
            0
          ],
          "destination": [
            "pcontrol",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-13",
            0
          ],
          "destination": [
            "pcontrol",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-14",
            0
          ],
          "destination": [
            "lifecycle",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-15",
            0
          ],
          "destination": [
            "lifecycle",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "event-16",
            0
          ],
          "destination": [
            "lifecycle",
            0
          ]
        }
      }
    ]
  }
}
