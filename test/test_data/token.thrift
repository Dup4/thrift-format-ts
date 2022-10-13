struct foo {
    1: i32 bar (presence = "required"),
    2: i32 baz (presence = "manual",cpp.use_pointer = "",),
    3: i32 qux,
    4: i32 bop,
} (cpp.type = "DenseFoo",python.type = "DenseFoo",java.final = "",annotation.without.value,)
