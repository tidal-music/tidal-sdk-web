#!/usr/bin/env kotlin

@file:DependsOn("com.fasterxml.jackson.module:jackson-module-kotlin:2.21.0")

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import java.io.File

data class Module(val name: String, val version: String)

val modulesWithVersionsJson = args[0]

val modules: List<Module> = jacksonObjectMapper().readValue(modulesWithVersionsJson)

for (module in modules) {
    val moduleName = module.name
    val version = module.version
    val pattern = Regex("## \\[$version\\]")
    val changelogContent = File("./$moduleName/CHANGELOG.md").readText()
    if (pattern.containsMatchIn(changelogContent)) {
        println("✅ Version string $version found in CHANGELOG.md for module $moduleName")
    } else {
        println("⛔️ String $version not found in CHANGELOG.md for module $moduleName")
        System.exit(1)
    }
}

