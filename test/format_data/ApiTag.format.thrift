service ApiTag {
    void Bar() (api.post = "/Bar", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer = "json"),
    void Baz() (api.post = "/Baz", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer = "json"),
    void Deprecated() (deprecated),                                                                                    // no comment
}
