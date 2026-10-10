// Variables principales
let pasos = 0;
let distanciaKm = 0;
let calorias = 0;
let caminando = false;

let tiempoInicio = 0;
let cronometroIntervalo = null;
let segundosTranscurridos = 0;

// Variables y lógica del Watchdog (Vigía de suspensión)
let watchdogTimer = null;
let ultimoPasoRegistrado = 0;
let ultimaMarcaTiempo = Date.now();

// Funciones para evitar que la pantalla se apague (Wake Lock)
let wakeLock = null;
async function solicitarWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Pantalla bloqueada para que no se apague.");
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function liberarWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log("Wake lock liberado.");
        });
    }
}

const longitudZancada = 0.74; 
const pesoUsuarioKg = 70;    

const btnEmpezar = document.getElementById('btnEmpezar');
const btnParar = document.getElementById('btnParar');
const btnTutorial = document.getElementById('btnTutorial');
const cerrarTutorialBtn = document.getElementById('CerrarTutorial');
const modalTutorial = document.getElementById('modalTutorial');
const txtPasos = document.getElementById('contadorPasos');
const txtKm = document.getElementById('contadorKm');
const txtKcal = document.getElementById('contadorKcal');
const estadoActividad = document.getElementById('estadoActividad');
const listaHistorialContainer = document.getElementById('listaHistorial');
const btnBorrarHistorial = document.getElementById('btnBorrarHistorial');

// Selectores para la navegación entre pantallas
const btnCambiarPantalla = document.getElementById('btnCambiarPantalla');
const pantallaPodometro = document.getElementById('pantallaPodometro');
const pantallaHistorial = document.getElementById('pantallaHistorial');
let vistaActual = 'podometro'; // 'podometro' o 'historial'

let ultimoPasoTiempo = 0;
let miGrafica = null;

// Inicializar gráfica, lista de historial y eventos al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarGrafica();
    actualizarListaHistorial();
    actualizarResumenMensual();
    
    if (!localStorage.getItem('tutorialVisto')) {
        modalTutorial.style.display = 'flex';
    }
});

btnTutorial.addEventListener('click', () => {
    modalTutorial.style.display = 'flex';
});

cerrarTutorialBtn.addEventListener('click', () => {
    modalTutorial.style.display = 'none';
    localStorage.setItem('tutorialVisto', 'true');
});

async function solicitarPermisosSensor() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const respuesta = await DeviceMotionEvent.requestPermission();
            if (respuesta === 'granted') {
                iniciarSensor();
            } else {
                alert("Se necesitan permisos de movimiento para contar los pasos.");
            }
        } catch (error) {
            console.error(error);
        }
    } else {
        iniciarSensor();
    }
}

function iniciarSensor() {
    caminando = true;
    pasos = 0;
    distanciaKm = 0;
    calorias = 0;
    segundosTranscurridos = 0;
    tiempoInicio = new Date();

    if (pantallaHistorial && pantallaPodometro) {
        pantallaHistorial.style.display = 'none';
        pantallaPodometro.style.display = 'flex';
        if (btnCambiarPantalla) btnCambiarPantalla.textContent = "📊 Ver Historial y Estadísticas";
        vistaActual = 'podometro';
    }
    
    // Solicitamos que la pantalla no se apague en el móvil
    solicitarWakeLock();
    
    actualizarPantalla();
    
    // Iniciar cronómetro de segundos
    cronometroIntervalo = setInterval(() => {
        segundosTranscurridos++;
    }, 1000);
    
    // Cambios visuales de estado activo
    document.body.classList.add('activo');
    estadoActividad.textContent = "Estado: En marcha (Caminando)";
    estadoActividad.className = "estado-activo";
    
    btnEmpezar.disabled = true;
    btnParar.disabled = false;
    
    window.addEventListener('devicemotion', manejarMovimiento);

    // INICIAMOS EL VIGÍA DE SUSPENSIÓN
    iniciarWatchdog();
}

function manejarMovimiento(evento) {
    if (!caminando) return;

    let acc = evento.accelerationIncludingGravity;
    if (!acc) return;

    let movimientoTotal = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    let ahora = new Date().getTime();

    if (movimientoTotal > 12 && (ahora - ultimoPasoTiempo) > 300) {
        pasos++;
        ultimoPasoTiempo = ahora;
        
        distanciaKm = (pasos * longitudZancada) / 1000;
        calorias = pasos * 0.04 * (pesoUsuarioKg / 70);

        actualizarPantalla();
        registrarActividadPasos(pasos);
    }
}

// --- FUNCIONES DEL WATCHDOG (VIGÍA) ---
function iniciarWatchdog() {
    ultimoPasoRegistrado = pasos;
    ultimaMarcaTiempo = Date.now();

    if (watchdogTimer) clearInterval(watchdogTimer);

    watchdogTimer = setInterval(() => {
        if (caminando) {
            let tiempoSinMoverse = Date.now() - ultimaMarcaTiempo;
            if (tiempoSinMoverse > 120000) {
                mostrarAvisoSuspension();
            }
        }
    }, 30000);
}

function detenerWatchdog() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }
}

function registrarActividadPasos(pasosActuales) {
    if (pasosActuales > ultimoPasoRegistrado) {
        ultimoPasoRegistrado = pasosActuales;
        ultimaMarcaTiempo = Date.now();
    }
}

function mostrarAvisoSuspension() {
    const modal = document.getElementById("modalSuspension");
    if (modal) {
        modal.style.display = "flex";
    }
}

const btnCerrarSusp = document.getElementById("btnCerrarSuspension");
if (btnCerrarSusp) {
    btnCerrarSusp.addEventListener("click", function() {
        document.getElementById("modalSuspension").style.display = "none";
        ultimaMarcaTiempo = Date.now();
    });
}

function actualizarPantalla() {
    txtPasos.textContent = pasos;
    txtKm.textContent = distanciaKm.toFixed(2);
    txtKcal.textContent = calorias.toFixed(1);
}

function formatearTiempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins} min ${secs} seg`;
}

function guardarPaseo() {
    if (pasos === 0) {
        alert("No has dado ningún paso en este paseo.");
        return;
    }

    clearInterval(cronometroIntervalo);

    const horaInicioStr = tiempoInicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hoy = new Date().toLocaleDateString();
    const tiempoTotalStr = formatearTiempo(segundosTranscurridos);

    let velocidadKmH = 0;
    if (segundosTranscurridos > 0) {
        velocidadKmH = (distanciaKm / segundosTranscurridos) * 3600;
    }

    const nuevoPaseo = {
        fecha: hoy,
        horaInicio: horaInicioStr,
        duracion: tiempoTotalStr,
        pasos: pasos,
        km: Number(distanciaKm.toFixed(2)),
        kcal: Number(calorias.toFixed(1)),
        velocidad: Number(velocidadKmH.toFixed(1))
    };

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    historial.push(nuevoPaseo);
    localStorage.setItem('historialPaseos', JSON.stringify(historial));

    actualizarGrafica();
    actualizarListaHistorial();
    actualizarResumenMensual();
    
    alert(`¡Paseo guardado!\nFecha: ${hoy} (${horaInicioStr})\nTiempo: ${tiempoTotalStr}\nPasos: ${pasos} (${distanciaKm.toFixed(2)} Km)\nVelocidad: ${velocidadKmH.toFixed(1)} Km/h`);
}

function actualizarListaHistorial() {
    if (!listaHistorialContainer) return;

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    
    if (historial.length === 0) {
        listaHistorialContainer.innerHTML = `<p class="sin-historial">No hay paseos guardados todavía.</p>`;
        return;
    }

    const historialInvertido = [...historial].reverse();
    
    let html = '';
    historialInvertido.forEach(paseo => {
        const vel = paseo.velocidad !== undefined ? paseo.velocidad : 0;

        html += `
            <div class="item-historial">
                <div class="item-historial-Header">
                    <span>📅 ${paseo.fecha} 🕒 ${paseo.horaInicio}</span>
                </div>
                <div class="item-historial-detalles">
                    👣 <strong>${paseo.pasos} pasos</strong> | 📏 <strong>${paseo.km} Km</strong> | ⏱️ ${paseo.duracion} | ⚡ <strong>${vel} Km/h</strong>
                </div>
            </div>
        `;
    });

    listaHistorialContainer.innerHTML = html;
}

function actualizarResumenMensual() {
    const contenedorMensual = document.getElementById('resumenMensual');
    if (!contenedorMensual) return;

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    
    if (historial.length === 0) {
        contenedorMensual.innerHTML = `<p class="sin-historial">No hay datos mensuales todavía.</p>`;
        return;
    }

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const acumuladoMeses = {};

    historial.forEach(paseo => {
        const partes = paseo.fecha.split('/');
        if (partes.length === 3) {
            const mesIndex = parseInt(partes[1], 10) - 1;
            const anio = partes[2];
            const claveMes = `${mesesNombres[mesIndex]} ${anio}`;

            if (!acumuladoMeses[claveMes]) {
                acumuladoMeses[claveMes] = { pasos: 0, km: 0, totalPaseos: 0 };
            }

            acumuladoMeses[claveMes].pasos += paseo.pasos;
            acumuladoMeses[claveMes].km += paseo.km;
            acumuladoMeses[claveMes].totalPaseos += 1;
        }
    });

    let html = '';
    for (const [mes, datos] of Object.entries(acumuladoMeses)) {
        html += `
            <div class="item-historial">
                <div class="item-historial-Header">
                    <span>📅 <strong>${mes}</strong> (${datos.totalPaseos} paseos)</span>
                </div>
                <div class="item-historial-detalles">
                    👣 <strong>${datos.pasos} pasos</strong> | 📏 <strong>${datos.km.toFixed(2)} Km</strong>
                </div>
            </div>
        `;
    }

    contenedorMensual.innerHTML = html;
}

function actualizarGrafica() {
    const canvas = document.getElementById('graficaPasos');
    if (!canvas) return;

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    const ultimos = historial.slice(-7);
    const fechas = ultimos.map(item => `${item.fecha} (${item.horaInicio})`);
    const totalPasos = ultimos.map(item => item.pasos);

    if (miGrafica) {
        miGrafica.destroy();
    }

    miGrafica = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: fechas.length > 0 ? fechas : ['Hoy'],
            datasets: [{
                label: 'Pasos',
                data: totalPasos.length > 0 ? totalPasos : [0],
                backgroundColor: '#2ecc71',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Botón Empezar
btnEmpezar.addEventListener('click', () => {
    solicitarPermisosSensor();
});

// --- PROTECCIÓN DE PULSACIÓN LARGA PARA EL BOTÓN PARAR (Anticlucs de bolsillo) ---
let holdTimer = null;
let holdInterval = null;
const holdDuration = 5000; // 5 segundos obligatorios

if (btnParar) {
    const iniciarHold = (e) => {
        if (!caminando || btnParar.disabled) return;
        
        e.preventDefault();

        let segundosRestantes = 5;
        btnParar.textContent = `Mantén (${segundosRestantes}s)...`;
        btnParar.style.background = "linear-gradient(135deg, #e67e22 0%, #d35400 100%)"; // Naranja de alerta

        holdInterval = setInterval(() => {
            segundosRestantes--;
            if (segundosRestantes > 0) {
                btnParar.textContent = `Mantén (${segundosRestantes}s)...`;
            }
        }, 1000);

        holdTimer = setTimeout(() => {
            cancelarHold();
            ejecutarPararReal();
        }, holdDuration);
    };

    const cancelarHold = () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        if (holdInterval) {
            clearInterval(holdInterval);
            holdInterval = null;
        }
        if (caminando) {
            btnParar.textContent = "Parar";
            btnParar.style.background = ""; // Restaura su estilo original
        }
    };

    // Eventos táctiles y de ratón
    btnParar.addEventListener('mousedown', iniciarHold);
    btnParar.addEventListener('touchstart', iniciarHold);

    btnParar.addEventListener('mouseup', cancelarHold);
    btnParar.addEventListener('mouseleave', cancelarHold);
    btnParar.addEventListener('touchend', cancelarHold);
    btnParar.addEventListener('touchcancel', cancelarHold);
}

// Función que se ejecuta tras aguantar los 3 segundos exactos
function ejecutarPararReal() {
    // 🛡️ SEGUNDA BARRERA: Confirmación clásica de seguridad
    let seguro = confirm("¿Deseas finalizar el paseo y guardar los datos?");
    if (!seguro) {
        return; // Si cancela, el paseo continúa
    }

    caminando = false;
    window.removeEventListener('devicemotion', manejarMovimiento);
    
    detenerWatchdog();
    liberarWakeLock();
    
    document.body.classList.remove('activo');
    estadoActividad.textContent = "Estado: Detenido";
    estadoActividad.className = "estado-parado";
    
    btnEmpezar.disabled = false;
    btnParar.disabled = true;
    btnParar.textContent = "Parar";
    btnParar.style.background = "";
    
    guardarPaseo();
}
// -------------------------------------------------------------------------------

if (btnBorrarHistorial) {
    btnBorrarHistorial.addEventListener('click', () => {
        let seguro = confirm("¿Estás seguro de que quieres borrar todo el historial de paseos?");
        
        if (seguro) {
            localStorage.removeItem('historialPaseos');
            alert("Historial borrado correctamente.");
            location.reload();
        }
    });
}

// Navegación entre pantallas
if (btnCambiarPantalla) {
    btnCambiarPantalla.addEventListener('click', () => {
        if (vistaActual === 'podometro') {
            pantallaPodometro.style.display = 'none';
            pantallaHistorial.style.display = 'flex';
            btnCambiarPantalla.textContent = "👣 Volver al Podómetro";
            vistaActual = 'historial';
        } else {
            pantallaHistorial.style.display = 'none';
            pantallaPodometro.style.display = 'flex';
            btnCambiarPantalla.textContent = "📊 Ver Historial y Estadísticas";
            vistaActual = 'podometro';
        }
    });
}