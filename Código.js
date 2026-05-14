/**
 * SUPER PLANNER BRUNA - WEB APP BACKEND v2.0
 * Versão: 2.0 (Premium)
 * Proprietário: brunahorsthb@gmail.com
 * Melhorias: Sincronização bidirecional, relatórios, integrações avançadas
 */

// Função principal para servir o HTML do Web App
function doGet() {
  return HtmlService.createTemplateFromFile("planner_webapp_v2_frontend")
      .evaluate()
      .setTitle("Super Planner Bruna v2.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Sincroniza eventos do Web App com o Google Agenda (Bidirecional)
 */
function syncToCalendar(plannerData) {
  var calendar = CalendarApp.getDefaultCalendar();
  var syncLog = [];

  try {
    // Sincronizar eventos
    if (plannerData.events) {
      for (var dayKey in plannerData.events) {
        if (plannerData.events.hasOwnProperty(dayKey)) {
          var dayEvents = plannerData.events[dayKey];
          dayEvents.forEach(function(event) {
            var date = getNextDate(getDayIndex(dayKey));
            var start = combineDateAndTime(date, event.time);
            var end = new Date(start.getTime() + (event.duration || 30) * 60 * 1000);
            
            calendar.createEvent(event.title, start, end);
            syncLog.push("✓ Evento criado: " + event.title);
          });
        }
      }
    }

    // Sincronizar metas como blocos de tempo
    if (plannerData.goals) {
      plannerData.goals.forEach(function(goal) {
        if (!goal.completed) {
          var goalDate = new Date();
          goalDate.setDate(goalDate.getDate() + Math.floor(Math.random() * 5)); // Distribui ao longo da semana
          var goalStart = new Date(goalDate);
          goalStart.setHours(18, 0, 0);
          var goalEnd = new Date(goalStart.getTime() + 60 * 60 * 1000); // 1 hora
          
          calendar.createEvent("[META] " + goal.title, goalStart, goalEnd);
          syncLog.push("✓ Meta criada: " + goal.title);
        }
      });
    }

    return {
      success: true,
      message: "✅ Sincronização concluída!",
      log: syncLog
    };
  } catch (error) {
    return {
      success: false,
      message: "❌ Erro na sincronização: " + error.toString(),
      log: syncLog
    };
  }
}

/**
 * Gera um relatório semanal com estatísticas
 */
function generateWeeklyReport(plannerData) {
  var report = {
    habitCompletion: 0,
    goalCompletion: 0,
    workoutCount: 0,
    fastingDays: 0,
    totalHabits: 0,
    totalGoals: 0
  };

  // Calcular conclusão de hábitos
  if (plannerData.habits) {
    report.totalHabits = plannerData.habits.length;
    report.habitCompletion = Math.round(
      (plannerData.habits.filter(h => h.completed).length / report.totalHabits) * 100
    );
  }

  // Calcular conclusão de metas
  if (plannerData.goals) {
    report.totalGoals = plannerData.goals.length;
    report.goalCompletion = report.totalGoals > 0 ? 
      Math.round((plannerData.goals.filter(g => g.completed).length / report.totalGoals) * 100) : 0;
  }

  // Contar treinos (heurística: hábito "Treino" completo)
  if (plannerData.habits) {
    var workoutHabit = plannerData.habits.find(h => h.name.toLowerCase().includes('treino'));
    if (workoutHabit) {
      report.workoutCount = workoutHabit.streak || 0;
    }
  }

  // Contar dias em jejum (heurística: 6 dias por semana, exceto sábado)
  report.fastingDays = 6;

  return report;
}

/**
 * Exporta o planner como PDF (instrução para o cliente)
 */
function exportAsPDF() {
  return "Para gerar o PDF, use a biblioteca jsPDF no frontend.";
}

/**
 * Sincroniza de volta: lê eventos do Google Agenda e atualiza o planner
 */
function syncFromCalendar() {
  var calendar = CalendarApp.getDefaultCalendar();
  var events = calendar.getEvents(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  
  var plannerEvents = {};
  events.forEach(function(event) {
    var eventDate = event.getStartTime();
    var dayOfWeek = eventDate.getDay();
    var dayName = getDayNameFromIndex(dayOfWeek);
    
    if (!plannerEvents[dayName]) {
      plannerEvents[dayName] = [];
    }
    
    var time = Utilities.formatDate(eventDate, "GMT-3", "HH:mm");
    plannerEvents[dayName].push({
      title: event.getTitle(),
      time: time,
      duration: Math.round((event.getEndTime() - event.getStartTime()) / (60 * 1000))
    });
  });

  return plannerEvents;
}

/**
 * Salva dados do planner em uma planilha de backup
 */
function backupPlannerData(plannerData) {
  var ss = SpreadsheetApp.create("Backup Planner Bruna - " + new Date().toLocaleDateString());
  var sheet = ss.getActiveSheet();
  
  // Cabeçalho
  sheet.appendRow(["Tipo", "Descrição", "Status", "Data"]);
  
  // Hábitos
  if (plannerData.habits) {
    plannerData.habits.forEach(function(habit) {
      sheet.appendRow(["Hábito", habit.name, habit.completed ? "Concluído" : "Pendente", new Date()]);
    });
  }
  
  // Metas
  if (plannerData.goals) {
    plannerData.goals.forEach(function(goal) {
      sheet.appendRow(["Meta", goal.title + " (" + goal.category + ")", goal.completed ? "Concluído" : "Pendente", new Date()]);
    });
  }

  return ss.getUrl();
}

// Funções auxiliares
function getDayIndex(dayName) {
  var daysMap = {
    'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6
  };
  return daysMap[dayName.toLowerCase()];
}

function getDayNameFromIndex(index) {
  var daysArray = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return daysArray[index];
}

function getNextDate(dayOfWeek) {
  var today = new Date();
  var resultDate = new Date(today.getTime());
  resultDate.setDate(today.getDate() + (dayOfWeek + 7 - today.getDay()) % 7);
  resultDate.setHours(0, 0, 0, 0);
  return resultDate;
}

function combineDateAndTime(date, timeStr) {
  var parts = timeStr.split(':');
  var newDate = new Date(date.getTime());
  newDate.setHours(parseInt(parts[0]), parseInt(parts[1]), 0);
  return newDate;
}
