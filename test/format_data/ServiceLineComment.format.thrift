service ApiTag {
    // Bar
    void Bar() (api.post = "/Bar", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer = "json"),
    // Baz
    void Baz() (api.post = "/Baz", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer = "json"),
    // Deprecated
    void Deprecated() (deprecated),
}
