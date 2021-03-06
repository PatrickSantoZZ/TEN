
const HIDE_DURATION = true,
   	  HIDE_MESSAGE = true
const ITEMS_NOSTRUM = new Set([152898, 184659, 201005, 201022, 855604, 201006, 201007, 201008]), // EU, NA, RU, JP, TH, TW
      BUFF_NOSTRUM = new Set([4030, 4031, 4032, 4033])


module.exports = function TrueEverfulNostrum(m) {
	let gameId = null,
		premiumSlot = null,
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
			let msg = m.parseSystemMessage(e.message);
				//type = msg[0].startsWith('@') ? sysmsg.maps.get(m.base.protocolVersion).code.get(msg[0].slice(1)) : ''

			if(msg.id == 'SMT_ITEM_USED' || msg.id == 'SMT_CANT_USE_ITEM_COOLTIME') {
				let obj = {}

				for(let i = 2; i < msg.length; i += 2) obj[msg[i - 1]] = msg[i]

				for(let item of ITEMS_NOSTRUM)
					if(obj.ItemName == '@item:' + item) return false
			}
		})

	m.hook('S_PREMIUM_SLOT_DATALIST', 2, e => {
		premiumSlot = null

		for(let set of e.sets)
			for(let item of set.inventory)
				if(ITEMS_NOSTRUM.has(item.id)) {
					premiumSlot = { set: set.id, slot: item.slot, type: item.type, id: item.id }
					return
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
		if((e.gameId == gameId) && alive != e.alive) {
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
		if((e.target == gameId) && BUFF_NOSTRUM.has(e.id)) {
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
		if(e.target == gameId) nostrum(mounted = enter)
	}

	function contract(enter) {
		nostrum(inContract = enter)
	}

	function nostrum(disable) {
		clearTimeout(timeout)

		if(!disable && alive && !mounted && !inContract && !inBG && premiumSlot != null) timeout = setTimeout(useNostrum, nextUse - Date.now())
	}

	function useNostrum() {
		let time = Date.now()

		if(time >= cooldown) {
			m.toServer('C_USE_PREMIUM_SLOT', 1, premiumSlot)
			nextUse = Date.now() + 1000
			nostrum()
		}
		else timeout = setTimeout(useNostrum, cooldown - time)
	}
}