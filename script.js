// Variables principales
let pasos = 0;
let distanciaKm = 0;
let calorias = 0;
let caminando = false;

const longitudZancada = 0.74; 
const pesoUsuarioKg = 70;     

const btnEmpezar = document.getElementById('btnEmpezar');
const btnParar = document.getElementById('btnParar');
const txtPasos = document.getElementById('contadorPasos');
const txtKm = document.getElementById('contadorKm');
const txtKcal = document.getElementById('contadorKcal');

let ultimoPasoTiempo = 0;
let miGrafica = null;

// Inicializar gráfica al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarGrafica();
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
    actualizarPantalla();
    
    alert("¡Podómetro en marcha! Ya puedes guardar el móvil en el bolsillo.");
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

function guardarPaseo() {
    if (pasos === 0) {
        alert("No has dado ningún paso en este paseo.");
        return;
    }

    const hoy = new Date().toLocaleDateString();
    const nuevoPaseo = {
        fecha: hoy,
        pasos: pasos,
        km: Number(distanciaKm.toFixed(2)),
        kcal: Number(calorias.toFixed(1))
    };

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    historial.push(nuevoPaseo);
    localStorage.setItem('historialPaseos', JSON.stringify(historial));

    actualizarGrafica();
    alert(`¡Paseo guardado!\nPasos: ${pasos} (${distanciaKm.toFixed(2)} Km)`);
}

function actualizarGrafica() {
    const canvas = document.getElementById('graficaPasos');
    if (!canvas) return;

    let historial = JSON.parse(localStorage.getItem('historialPaseos')) || [];
    
    // Cogemos los últimos 7 registros para que la gráfica no se sature
    const ultimos = historial.slice(-7);
    const fechas = ultimos.map(item => item.fecha);
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

// Botones
btnEmpezar.addEventListener('click', () => {
    solicitarPermisosSensor();
});

btnParar.addEventListener('click', () => {
    if (!caminando) return;
    caminando = false;
    window.removeEventListener('devicemotion', manejarMovimiento);
    guardarPaseo();
});