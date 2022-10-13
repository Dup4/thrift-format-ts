// ServiceLineComment

service ApiTag {
   // Bar Comment
   void Bar() (api.post="/Bar", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"),

   // Baz Comment
   // Baz Comment
   // Baz Comment
    void Baz() (api.post="/Baz", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"),

    /*
        Foo Comment
    */
    void Foo() (api.post="/Foo", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"),

    // Deprecated
    void Deprecated() (deprecated),
}
