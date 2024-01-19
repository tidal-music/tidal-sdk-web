# TIDAL Common

A module containing shared code that should be available to multiple modules.
This includes globally shared error and message classes/types. "Hoisting" those here also ensures we avoid circular dependencies, all modules can depend on `common`, but `common` cannot depend on any other TIDAL module.
