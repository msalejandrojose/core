class_name Checkpoint extends Area3D

## Puerta de paso del circuito. Detecta solo la esfera física del vehículo
## (collision_layer 8 en vehicle.tscn); si mirase todas las capas se dispararía
## con el suelo del GridMap, que también es un cuerpo estático.

signal crossed(checkpoint: Checkpoint)

## Orden dentro de la vuelta, empezando en 0. Se ignora si `is_finish`.
@export var index: int = 0

## La meta cierra la vuelta en vez de sumar sector.
@export var is_finish: bool = false


func _ready() -> void:
	add_to_group("checkpoint")
	body_entered.connect(_on_body_entered)


func _on_body_entered(_body: Node3D) -> void:
	crossed.emit(self)
