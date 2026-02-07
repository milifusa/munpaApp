/**
 * Script para crear las categorías de hitos iniciales
 * Ejecutar: node scripts/createMilestoneCategories.js
 */

const categories = [
  {
    name: "Social",
    description: "Interacción social y emociones",
    icon: "👥",
    color: "#A78BFA", // Morado claro
    order: 1
  },
  {
    name: "Comunicación",
    description: "Habla y comprensión del lenguaje",
    icon: "💬",
    color: "#34D399", // Verde
    order: 2
  },
  {
    name: "Cognitiva",
    description: "Pensamiento, aprendizaje y resolución de problemas",
    icon: "🧠",
    color: "#F87171", // Rojo claro
    order: 3
  },
  {
    name: "Movimiento",
    description: "Movimientos corporales y coordinación",
    icon: "🏃",
    color: "#60A5FA", // Azul
    order: 4
  }
];

async function createCategories() {
  const API_BASE_URL = 'https://api.munpa.online/api';
  
  console.log('🚀 Iniciando creación de categorías...\n');
  console.log('⚠️  IMPORTANTE: Necesitas un token de ADMIN para crear categorías.');
  console.log('📝 Ingresa tu token de admin cuando se solicite.\n');

  // Solicitar token de admin
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('🔑 Token de Admin: ', async (adminToken) => {
    if (!adminToken || adminToken.trim() === '') {
      console.error('❌ Token de admin requerido');
      readline.close();
      process.exit(1);
    }

    console.log('\n📦 Creando categorías...\n');

    for (const category of categories) {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/milestones/categories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(category)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`✅ ${category.icon} ${category.name} - Creada exitosamente (ID: ${data.data.id})`);
        } else {
          console.error(`❌ ${category.name} - Error: ${data.message || 'Error desconocido'}`);
        }
      } catch (error) {
        console.error(`❌ ${category.name} - Error de red:`, error.message);
      }
    }

    console.log('\n🎉 Proceso completado!\n');
    console.log('📱 Ahora puedes recargar la app para ver las categorías.');
    
    readline.close();
  });
}

createCategories();
