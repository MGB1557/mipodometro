// Variables principales
let pasos = 0;
let distanciaKm = 0;
let calorias = 0;
let caminando = false;

let tiempoInicio = 0;
let cronometroIntervalo = null;
let segundosTranscurridos = 0;

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

let ultimoPasoTiempo = 0;
let miGrafica = null;

// Inicializar gráfica, lista de historial y eventos al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarGrafica();
    actualizarListaHistorial();
    
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
    }
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

    // CÁLCULO DE LA VELOCIDAD (Km/h)
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
    
    alert(`¡Paseo guardado!\nFecha: ${hoy} (${horaInicioStr})\nTiempo: ${tiempoTotalStr}\nPasos: ${pasos} (${distanciaKm.toFixed(2)} Km)\nVelocidad: ${velocidadKmH.toFixed(1)} Km/h`);
}

function actualizarListaHistorial() {
    if (!listaHistorialContainer) return;

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    
    if (historial.length === 0) {
        listaHistorialContainer.innerHTML = `<p class="sin-historial">No hay paseos guardados todavía.</p>`;
        return;
    }

    // Mostramos los paseos del más reciente al más antiguo
    const historialInvertido = [...historial].reverse();
    
    let html = '';
    historialInvertido.forEach(paseo => {
        const vel = paseo.velocidad !== undefined ? paseo.velocidad : 0;

        html += `
            <div class="item-historial">
                <div class="item-historial-Header">
                    <span>📅 ${paseo.fecha} - 🕒 ${paseo.horaInicio}</span>
                </div>
                <div class="item-historial-detalles">
                    👣 <strong>${paseo.pasos} pasos</strong> | 📏 <strong>${paseo.km} Km</strong> | ⏱️ ${paseo.duracion} | ⚡ <strong>${vel} Km/h</strong>
                </div>
            </div>
        `;
    });

    listaHistorialContainer.innerHTML = html;
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

// Botones de control
btnEmpezar.addEventListener('click', () => {
    solicitarPermisosSensor();
});

btnParar.addEventListener('click', () => {
    if (!caminando) return;
    caminando = false;
    window.removeEventListener('devicemotion', manejarMovimiento);
    
    document.body.classList.remove('activo');
    estadoActividad.textContent = "Estado: Detenido";
    estadoActividad.className = "estado-parado";
    
    btnEmpezar.disabled = false;
    btnParar.disabled = true;
    
    guardarPaseo();
});