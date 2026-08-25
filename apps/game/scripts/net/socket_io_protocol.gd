class_name SocketIoProtocol

## Framing mínimo de Engine.IO v4 + Socket.IO v4 sobre `WebSocketPeer`
## (TASK-323, tarea 6): Godot no trae cliente de Socket.IO — solo el
## `WebSocketPeer` crudo — así que esto es lo justo para hablar con el
## `LiveRaceGateway` del backend (nsp `/racing-live`, transporte
## solo-websocket, sin long-polling ni acks): abrir el nsp con el JWT,
## mandar/recibir eventos, y responder al ping de mantenimiento.
##
## Funciones puras (texto entra, texto/diccionario sale) para poder
## testearlas sin un socket real — quien las usa de verdad es
## `live_race_socket.gd`.
##
## Formato de un frame de mensaje (Engine.IO tipo "4"):
##   4<tipo Socket.IO><nsp>,<JSON>
## p.ej. `42/racing-live,["racing-live:join",{"trackSlug":"kenney-01"}]`

## A partir de `Api.base_url` (p.ej. "http://192.168.1.5:3000/v1") arma la
## URL del WebSocket contra el endpoint de Engine.IO — que vive en la raíz
## del servidor HTTP, no bajo `/v1` (el prefijo global de la API solo
## afecta a los controllers REST, no a los gateways WebSocket).
static func websocket_url(api_base_url: String) -> String:
	var url := api_base_url
	if url.begins_with("https://"):
		url = "wss://" + url.substr("https://".length())
	elif url.begins_with("http://"):
		url = "ws://" + url.substr("http://".length())

	# Solo interesa el host:puerto — se corta en la primera "/" que quede
	# (el "/v1" del final, si lo hay).
	var scheme_end := url.find("://") + 3
	var path_start := url.find("/", scheme_end)
	if path_start != -1:
		url = url.substr(0, path_start)

	return url + "/socket.io/?EIO=4&transport=websocket"


## Paquete Socket.IO CONNECT para abrir un nsp, con el JWT como auth
## (lo que `LiveRaceGateway.handleConnection` espera en `handshake.auth.token`
## — aquí va en el cuerpo del CONNECT, no en el handshake HTTP, porque el
## transporte es solo-websocket sin fase de polling previa).
static func encode_connect(nsp: String, auth: Dictionary) -> String:
	return "40%s,%s" % [nsp, JSON.stringify(auth)]


## Un evento saliente: `["nombre-evento", payload]`, envuelto en el frame de
## mensaje de Engine.IO. `payload` puede ser null para eventos sin cuerpo
## (p.ej. "racing-live:leave").
static func encode_event(nsp: String, event_name: String, payload) -> String:
	var array: Array = [event_name]
	if payload != null:
		array.append(payload)
	return "42%s,%s" % [nsp, JSON.stringify(array)]


## Respuesta al ping de mantenimiento de Engine.IO — sin esto el servidor
## cierra la conexión por inactividad pasado `pingTimeout`.
static func encode_pong() -> String:
	return "3"


## Decodifica un frame de texto crudo recibido del `WebSocketPeer`.
##
## Devuelve un diccionario con `eio_type` (el primer carácter, tipo
## Engine.IO) siempre presente, y además — solo para `eio_type == "4"`
## (mensaje) — `sio_type` (tipo Socket.IO), `nsp` y `payload` (ya
## parseado de JSON, o `null` si el frame no traía cuerpo).
##
## Diccionario vacío si el frame no se puede interpretar en absoluto (cadena
## vacía) — quien llama debe tratarlo como "ignorar este frame".
static func decode_packet(raw: String) -> Dictionary:
	if raw.length() == 0:
		return {}

	var eio_type := raw.substr(0, 1)
	if eio_type != "4":
		# open/close/ping/pong/upgrade/noop de Engine.IO — sin cuerpo Socket.IO.
		return {"eio_type": eio_type}

	var rest := raw.substr(1)
	if rest.length() == 0:
		return {"eio_type": eio_type, "sio_type": "", "nsp": "/", "payload": null}

	var sio_type := rest.substr(0, 1)
	var body := rest.substr(1)

	var nsp := "/"
	var json_part := body
	if body.begins_with("/"):
		var comma := body.find(",")
		if comma == -1:
			nsp = body
			json_part = ""
		else:
			nsp = body.substr(0, comma)
			json_part = body.substr(comma + 1)

	var payload: Variant = null
	if json_part != "":
		payload = JSON.parse_string(json_part)

	return {
		"eio_type": eio_type,
		"sio_type": sio_type,
		"nsp": nsp,
		"payload": payload,
	}


## De un paquete de tipo EVENT (`sio_type == "2"`) ya decodificado, separa el
## nombre del evento de sus datos. `data` es `{}` si el evento no traía
## cuerpo o no era un diccionario (defensivo: un servidor mal portado no
## puede tumbar el cliente).
static func split_event(payload: Variant) -> Dictionary:
	if not (payload is Array) or payload.size() < 1:
		return {"name": "", "data": {}}
	var name := str(payload[0])
	var data: Variant = payload[1] if payload.size() > 1 else {}
	return {"name": name, "data": data if data is Dictionary else {}}
