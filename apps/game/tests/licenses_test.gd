extends Node

## Comprueba que el aviso MIT embebido en la app no se ha separado de
## LICENSES.md:
##
##     godot --quit-after 1800 res://tests/licenses_test.tscn
##
## El texto va duplicado a propósito (ver `licenses_screen.gd`): el .md es la
## fuente para el repo y la constante es lo que se distribuye. Este test es lo
## que impide que uno de los dos se quede atrás sin que nadie se entere.

const LicensesScreen := preload("res://scripts/ui/licenses_screen.gd")

var _failures := 0


func _ready() -> void:
	var file := FileAccess.open("res://LICENSES.md", FileAccess.READ)
	_check(file != null, true, "LICENSES.md existe en el repo")
	if file == null:
		get_tree().quit(1)
		return

	var markdown := file.get_as_text()
	var embedded: String = LicensesScreen.LICENSE_TEXT

	for line in [
		"MIT License",
		"Copyright (c) 2023 Kenney",
		"The above copyright notice and this permission notice shall be included in all",
		'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
	]:
		_check(markdown.contains(line), true, "LICENSES.md contiene: %s" % line.substr(0, 40))
		_check(embedded.contains(line), true, "el texto embebido contiene: %s" % line.substr(0, 40))

	_check(embedded.contains("CC0"), true, "el texto embebido menciona CC0 para los assets")
	_check(embedded.contains("Godot Engine"), true, "el texto embebido menciona el motor")

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _check(got: bool, want: bool, label: String) -> void:
	if got == want:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s" % label)
		_failures += 1
