var agamaContext;

const AGAMA_UPDATE_REASON = {
    SCHEDULED_UPDATE: 1,
    RESIZE: 2,
    CONFIG_CHANGE: 3,
    CREATE: 4
};

function onAgamaInitialize(context) {
    context.registerObserver(this);
    agamaContext = context;
}

/* Extend this list to add more supported tests */
let configs = [0,1,2,3,4,5];
let nrChecks = configs.length;
let checkContexts = configs.map(d => { return {uih: undefined };});

console.log("checkConstexts", checkContexts);

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
	...options,
	signal: controller.signal
    });
    clearTimeout(id);

    return response;
}


async function getStatus(uri, timeout) {
    let result;
    try {
	result = await Promise.allSettled([fetchWithTimeout(uri, { timeout:timeout })]);
    } catch (e) {
    }
    return result;
}

function update(state, i) {
    $(`#name-${i}`).html(state.configuration.config[`name_${i}`]);

    let failCodes = state.configuration.config[`failcodes_${i}`].split(",").map(d => parseInt(d));

    if (!state.configuration.config[`active_${i}`]) {
	$(`.status-box-${i}`).addClass("hide");
	$(`#name-${i}`).addClass("hide");
	return;
    }

    (async (i) =>
	{
	    let url = state.configuration.config[`url_${i}`];
	    if (state.configuration.config[`proxy_${i}`]) {		
		url = `${state.configuration.general.proxy}?url=${encodeURIComponent(url)}`;
	    }
	    console.log(url);
	    
	    let r = await getStatus(
		url,
		state.configuration.general.timeout*1000
	    );

	    console.log(`Fetch results`, r[0], i);

	    $(`#name-${i}`).removeClass("hide");
	    $(`.status-box-${i}`).removeClass("ok fail hide");
	    if (r[0].status === "fulfilled") {
		if ( failCodes.includes(r[0].value.status) ) {
		    $(`.status-box-${i}`).addClass("fail");
		} else {
		    $(`.status-box-${i}`).addClass("ok");
		}
	    } else {
		$(`.status-box-${i}`).addClass("fail");
	    }
	    if (r[0].status === "fulfilled")
		$(`.status-box-${i}`).attr('title', `Last result code: ${r[0].value.status}` );
	    else
		$(`.status-box-${i}`).attr('title', `Last result code: ${r[0].reason}` );
	}
    )(i);
}

function onUpdate(state, reason) {
    console.log(`OnUpdate: ${reason}`, state);

    if (reason === AGAMA_UPDATE_REASON.CREATE) {
	for (let i=0; i < nrChecks; i++) {

	    $(".checks").append(`<div id="name-${i}" class="name">not set</div>
                                 <a class="status-box status-box-${i}" ></a>`);
	    
	    checkContexts[i].uih = setInterval( () => {
		update(state,i);
	    }, state.configuration.general.interval*1000);
	    let link = state.configuration.config[`link_${i}`];
	    if (link !== "") {
		$(`.status-box-${i}`).attr('href', link);
	    }
	    update(state, i);
	}
    }

    if (reason === AGAMA_UPDATE_REASON.CONFIG_CHANGE) {
	for (let i=0; i < nrChecks; i++) {
	    clearInterval(checkContexts[i].uih);
	    checkContexts[i].uih = setInterval( () => {
		update(state,i);
	    }, state.configuration.general.interval*1000);
	    let link = state.configuration.config[`link_${i}`];
	    if (link !== "") {
		$(`.status-box-${i}`).attr('href', link);
	    }
	    update(state, i);
	}
    }

}

function onConfiguration() {
    /* Did not get arrays to work */
    /* Create the 6 checks programatically :-( */
    let checksConfig = configs.map(d => {
	return JSON.parse(` {
	    "active_${d}": {
		"title": "Active",
		"type": "boolean",
		"default": false,
		"options": {
		    "grid_columns": 1
		}
	    },
	    "proxy_${d}": {
		"title": "Proxy",
		"type": "boolean",
		"default": false,
		"options": {
		    "grid_columns": 1
		}
	    },
	    "name_${d}": {
		"title": "Name",
		"type": "string",
		"default": "Not set",
		"options": {
		    "grid_columns": 2
		}
	    },
	    "url_${d}": {
		"title": "URL",
		"type": "string",
		"default": "https://",
		"options": {
		    "grid_columns": 3
		}
	    },
	    "link_${d}": {
		"title": "Link",
		"type": "string",
		"default": "",
		"options": {
		    "grid_columns": 2
		}
	    },
	    "failcodes_${d}": {
		"title": "HTTP Codes indicating failure",
		"type": "string",
		"default": "403,404,500,600",
		"options": {
		    "grid_columns": 3
		}
	    }
	}`);
    });
    checksConfig = checksConfig.reduce((a,d) => {
	return {...a, ...d };
    }, {});

    return {
	general: {
	    title: "Settings",
	    type: "object",
	    format: "grid",
	    properties: {
		"interval": {
		    title: "Interval between checks (s)",
		    type: "integer",
		    default: 5,
                    options: {
			grid_columns: 2
                    }
		},
		"timeout": {
		    title: "REST API call timeout (s)",
		    type: "integer",
		    default: 5,
                    options: {
			grid_columns: 2
                    }
		},
		"proxy": {
		    title: "Mashup proxy URL",
		    type: "string",
		    default: "http://localhost:9090",
                    options: {
			grid_columns: 12 
                    }
		}		
	    }
	},
	config: {
	    type: "object",
	    format: "grid",
	    title: "Checks",
	    properties: checksConfig
	}
    };

}
