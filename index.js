
const HIDE_DURATION = true,
   	  HIDE_MESSAGE = true
const ITEMS_NOSTRUM = [152898, 184659, 201005, 201022, 855604, 201006, 201007, 201008], // EU, NA, RU, JP, TH, TW
      BUFF_NOSTRUM = [4030, 4031, 4032, 4033]


module.exports = function TrueEverfulNostrum(m) {
	let gameId = null,
		slot = -1,
		timeout = null,
		cooldown = 0,
		nextUse = 0,
		bgZone = -1,
		alive = false,
		mounted = false,
		inContract = false,
		inBG = false

	m.hook('S_LOGIN', 14, e => {
		({gameId} = e.gameId)
		nextUse = 0
	})

	m.hook('S_RETURN_TO_LOBBY', 1, e => { nostrum(true) })

	if(HIDE_MESSAGE)
		m.hook('S_SYSTEM_MESSAGE', 1, e => {
			let msg = mod.parseSystemMessage(e.message);
				//type = msg[0].startsWith('@') ? sysmsg.maps.get(m.base.protocolVersion).code.get(msg[0].slice(1)) : ''

			if(msg.id == 'SMT_ITEM_USED' || msg.id == 'SMT_CANT_USE_ITEM_COOLTIME') {
				let obj = {}

				for(let i = 2; i < msg.length; i += 2) obj[msg[i - 1]] = msg[i]

				for(let item of ITEMS_NOSTRUM)
					if(obj.ItemName == '@item:' + item) return false
			}
		})

	m.hook('S_PREMIUM_SLOT_DATALIST', 2, e => {
		for(let item of e.inventory)
			if(ITEMS_NOSTRUM.includes(item.item)) {
				slot = item.slot

				if(item.cooldown) cooldown = Date.now() + item.cooldown

				item.cooldown = 0 // Cooldowns from this packet don't seem to do anything except freeze your client briefly
				return true
			}
	})

	m.hook('S_ABNORMALITY_BEGIN', 4, abnormality.bind(null, 'S_ABNORMALITY_BEGIN'))
	m.hook('S_ABNORMALITY_REFRESH', 2, abnormality.bind(null, 'S_ABNORMALITY_REFRESH'))
	m.hook('S_ABNORMALITY_END', 1, abnormality.bind(null, 'S_ABNORMALITY_END'))

	m.hook('S_BATTLE_FIELD_ENTRANCE_INFO', 1, e => { bgZone = e.zone })

	m.hook('S_LOAD_TOPO', 3, e => {
		nextUse = 0
		mounted = inContract = false
		inBG = e.zone == bgZone

		nostrum(true)
	})
	m.hook('S_SPAWN_ME', 3, e => { nostrum(!(alive = e.alive)) })
	m.hook('S_CREATURE_LIFE', 3, e => {
		if(e.gameId.equals(gameId) && alive != e.alive) {
			nostrum(!(alive = e.alive))

			if(!alive) {
				nextUse = 0
				mounted = inContract = false
			}
		}
	})

	m.hook('S_MOUNT_VEHICLE', 2, mount.bind(null, true))
	m.hook('C_UNMOUNT_VEHICLE', 1, mount.bind(null, false))

	m.hook('S_REQUEST_CONTRACT', 1, contract.bind(null, true))
	m.hook('S_ACCEPT_CONTRACT', 1, contract.bind(null, false))
	m.hook('S_REJECT_CONTRACT', 1, contract.bind(null, false))
	m.hook('S_CANCEL_CONTRACT', 1, contract.bind(null, false))

	function abnormality(type, e) {
		if(e.target.equals(gameId) && (e.id == BUFF_NOSTRUM)) {
			nextUse = type == 'S_ABNORMALITY_END' ? 0 : Date.now() + Math.floor(e.duration / 2)
			nostrum()

			if(HIDE_DURATION) {
				if(type == 'S_ABNORMALITY_BEGIN') {
					e.duration = 0
					return true
				}
				if(type == 'S_ABNORMALITY_REFRESH') return false
			}
		}
	}

	function mount(enter, e) {
		if(e.target.equals(gameId)) nostrum(mounted = enter)
	}

	function contract(enter) {
		nostrum(inContract = enter)
	}

	function nostrum(disable) {
		clearTimeout(timeout)

		if(!disable && alive && !mounted && !inContract && !inBG && slot != -1) timeout = setTimeout(useNostrum, nextUse - Date.now())
	}

	function useNostrum() {
		let time = Date.now()

		if(time >= cooldown) {
			m.toServer('C_USE_PREMIUM_SLOT', 1, {slot})
			nextUse = Date.now() + 1000
			nostrum()
		}
		else timeout = setTimeout(useNostrum, cooldown - time)
	}
}