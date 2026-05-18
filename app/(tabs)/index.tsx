import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

//const API_BASE = "";
const storage = AsyncStorage;

function rand(min: number, max: number, dec = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}

function generateStations() {
  return ["Estación A"].map((name, i) => {
    const temp = rand(16, 36);
    const humAire = rand(38, 95);
    const humSuelo = rand(18, 82);
    const ph = rand(5.2, 7.8);
    let status = "ok";
    if (humSuelo < 25 || temp > 33 || humAire < 43) status = "danger";
    else if (humSuelo < 35 || temp > 29 || humAire < 54) status = "warn";
    return {
      name,
      zona: ["Norte", "Central", "Sur"][i],
      temp,
      humAire,
      humSuelo,
      ph,
      status,
    };
  });
}

const STATUS_COLOR = { ok: "#639922", warn: "#BA7517", danger: "#E24B4A" };
const STATUS_BG = { ok: "#eaf3de", warn: "#faeeda", danger: "#fcebeb" };
const STATUS_LABEL = { ok: "Normal", warn: "Alerta", danger: "Peligro" };

function StationCard({ station }: { station: any }) {
  return (
    <View style={s.stationCard}>
      <View style={s.stationHeader}>
        <Text style={s.stationName}>{station.name}</Text>
        <View
          style={[
            s.statusBadge,
            {
              backgroundColor:
                STATUS_BG[station.status as keyof typeof STATUS_BG],
            },
          ]}
        >
          <View
            style={[
              s.statusDot,
              {
                backgroundColor:
                  STATUS_COLOR[station.status as keyof typeof STATUS_COLOR],
              },
            ]}
          />
          <Text
            style={[
              s.statusText,
              {
                color:
                  STATUS_COLOR[station.status as keyof typeof STATUS_COLOR],
              },
            ]}
          >
            {STATUS_LABEL[station.status as keyof typeof STATUS_LABEL]}
          </Text>
        </View>
      </View>
      <Text style={s.stationZona}>Zona {station.zona}</Text>
      <View style={s.sensorRow}>
        <Text style={s.sensorLabel}>🌡 Temperatura</Text>
        <Text style={s.sensorValue}>{station.temp} °C</Text>
      </View>
      <View style={s.sensorRow}>
        <Text style={s.sensorLabel}>💧 Humedad aire</Text>
        <Text style={s.sensorValue}>{station.humAire} %</Text>
      </View>
      <View style={s.sensorRow}>
        <Text style={s.sensorLabel}>🌱 Humedad suelo</Text>
        <Text style={s.sensorValue}>{station.humSuelo} %</Text>
      </View>
      <View style={[s.sensorRow, { borderBottomWidth: 0 }]}>
        <Text style={s.sensorLabel}>⚗️ pH suelo</Text>
        <Text style={s.sensorValue}>{station.ph}</Text>
      </View>
    </View>
  );
}

function DashboardTab({
  stations,
  onRefresh,
}: {
  stations: any[];
  onRefresh: () => void;
}) {
  const avgTemp = (stations.reduce((a, s) => a + s.temp, 0) / 3).toFixed(1);
  const avgHum = (stations.reduce((a, s) => a + s.humAire, 0) / 3).toFixed(1);
  const avgSuelo = (stations.reduce((a, s) => a + s.humSuelo, 0) / 3).toFixed(
    1,
  );
  const alerts = stations.filter((s) => s.status !== "ok").length;

  return (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      <View style={s.tabHeader}>
        <Text style={s.tabTitle}>Dashboard</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Text style={s.refreshBtnText}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.tabSubtitle}>Lecturas en tiempo real — ESP32</Text>

      <View style={s.metricsGrid}>
        {[
          { label: "Temp. promedio", value: `${avgTemp} °C`, color: "#E24B4A" },
          { label: "Humedad aire", value: `${avgHum} %`, color: "#378ADD" },
          { label: "Humedad suelo", value: `${avgSuelo} %`, color: "#1D9E75" },
          {
            label: "Alertas activas",
            value: `${alerts}`,
            color: alerts > 0 ? "#BA7517" : "#639922",
          },
        ].map((m, i) => (
          <View key={i} style={s.metricCard}>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {stations.map((st, i) => (
        <StationCard key={i} station={st} />
      ))}
    </ScrollView>
  );
}

function YoloTab() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
      setResult(null);
    }
  }

  async function analyze() {
    if (!image) return;

    setLoading(true);

    try {
      const formData = new FormData();

      // WEB
      const response = await fetch(image);
      const blob = await response.blob();

      formData.append("file", blob, "photo.jpg");

      const res = await fetch(
        `https://e5af-152-201-175-182.ngrok-free.app/detect/ `,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      console.log(data);

      setResult(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={s.tabTitle}>Análisis YOLO</Text>
      <Text style={s.tabSubtitle}>
        Sube una foto de las hojas para detectar plagas
      </Text>

      <TouchableOpacity style={s.uploadArea} onPress={pickImage}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={s.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={s.uploadPlaceholder}>
            <Text style={s.uploadIcon}>📷</Text>
            <Text style={s.uploadText}>Toca para seleccionar una imagen</Text>
            <Text style={s.uploadSubText}>JPG o PNG desde tu galería</Text>
          </View>
        )}
      </TouchableOpacity>

      {image && (
        <View style={s.imageActions}>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => {
              setImage(null);
              setResult(null);
            }}
          >
            <Text style={s.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.analyzeBtn}
            onPress={analyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.analyzeBtnText}>Analizar con YOLO</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {result && (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>Cultivo ID: {result.cultivo_id}</Text>

          {result.detecciones?.map((item: string, index: number) => (
            <View key={index} style={s.detectionRow}>
              <Text style={s.detectionClass}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function RecsTab({ stations }: { stations: any[] }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchRecs() {
    setLoading(true);
    try {
      const res = await fetch(``, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estaciones: stations }),
      });
      const data = await res.json();
      setRecs(data.recomendaciones);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
      const alerts = stations.filter((s) => s.status !== "ok");
      setRecs([
        {
          tipo: "Riego",
          prioridad: "alta",
          texto: `La humedad del suelo en ${alerts[0]?.name || "Estación A"} está por debajo del umbral óptimo. Se recomienda activar el riego por goteo durante 20 minutos.`,
        },
        {
          tipo: "Temperatura",
          prioridad: "media",
          texto: `La temperatura promedio de ${(stations.reduce((a, s) => a + s.temp, 0) / 3).toFixed(1)}°C es adecuada. Monitorear en horas pico (12–15h).`,
        },
        {
          tipo: "Nutrientes",
          prioridad: "baja",
          texto:
            "Considerar aplicación de fertilizante nitrogenado en la próxima semana.",
        },
        {
          tipo: "Ventilación",
          prioridad: "baja",
          texto:
            "Los niveles de humedad del aire son normales. No se requiere acción inmediata.",
        },
      ]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRecs();
  }, []);

  const prioColor: any = {
    alta: { bg: "#fcebeb", text: "#A32D2D" },
    media: { bg: "#faeeda", text: "#854F0B" },
    baja: { bg: "#eaf3de", text: "#3B6D11" },
  };

  return (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      <View style={s.tabHeader}>
        <Text style={s.tabTitle}>Recomendaciones</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchRecs}>
          <Text style={s.refreshBtnText}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.tabSubtitle}>Generadas por el sistema RAG</Text>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color="#1D9E75" />
          <Text style={s.loadingText}>Consultando base de conocimiento...</Text>
        </View>
      ) : (
        recs.map((r, i) => (
          <View key={i} style={s.recCard}>
            <View style={s.recCardHeader}>
              <View
                style={[
                  s.prioBadge,
                  { backgroundColor: prioColor[r.prioridad]?.bg },
                ]}
              >
                <Text
                  style={[
                    s.prioBadgeText,
                    { color: prioColor[r.prioridad]?.text },
                  ]}
                >
                  {r.prioridad}
                </Text>
              </View>
              <Text style={s.recTipo}>{r.tipo}</Text>
            </View>
            <Text style={s.recCardText}>{r.texto}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ChatTab({ stations }: { stations: any[] }) {
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "Hola, soy el agente de monitoreo agrícola. ¿En qué te puedo ayudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function buildContext() {
    return `Eres un agente inteligente de monitoreo agrícola para un sistema de cultivos con estaciones ESP32.\n\nLecturas actuales:\n${stations.map((s) => `- ${s.name} (Zona ${s.zona}): Temp ${s.temp}°C, Humedad aire ${s.humAire}%, Humedad suelo ${s.humSuelo}%, pH ${s.ph}, Estado: ${s.status === "ok" ? "normal" : s.status === "warn" ? "alerta" : "peligro"}`).join("\n")}\n\nResponde en español, de forma concisa. Usa los datos reales para tus recomendaciones.`;
  }

  async function send() {
    const text = input.trim();

    if (!text || loading) return;

    setInput("");
    setLoading(true);

    try {
      // Obtener chat guardado
      const mensajesGuardados = await AsyncStorage.getItem("chat");

      let chat = mensajesGuardados ? JSON.parse(mensajesGuardados) : [];

      // Mensaje usuario
      const userMessage = {
        role: "user",
        text: text,
      };

      chat.push(userMessage);

      // Mostrar inmediatamente
      setMessages([...chat]);

      const res = await fetch(
        "https://e5af-152-201-175-182.ngrok-free.app/recomendaciones",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pregunta: text,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();

      const reply = data.respuestas || "No se pudo obtener respuesta.";

      // Mensaje bot
      const botMessage = {
        role: "agent",
        text: reply,
      };

      chat.push(botMessage);

      // Guardar chat completo
      await AsyncStorage.setItem("chat", JSON.stringify(chat));

      // Actualizar estado
      setMessages([...chat]);
    } catch (error) {
      console.log("ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Error de conexión. Verifica el backend o ngrok.",
        },
      ]);
    }

    setLoading(false);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }

  const quickQ = [
    "¿Cuál estación tiene mayor riesgo?",
    "¿Debo activar el riego?",
    "¿Qué cultivo recomiendas?",
  ];
  useEffect(() => {
    cargarChat();
  }, []);

  const cargarChat = async () => {
    const chatGuardado = await AsyncStorage.getItem("chat");

    if (chatGuardado) {
      setMessages(JSON.parse(chatGuardado));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.chatHeader}>
        <Text style={s.tabTitle}>Agente</Text>
        <Text style={s.tabSubtitle}>Consulta sobre el estado del cultivo</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.quickRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {quickQ.map((q, i) => (
          <TouchableOpacity
            key={i}
            style={s.quickBtn}
            onPress={() => setInput(q)}
          >
            <Text style={s.quickBtnText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={s.chatMessages}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, i) => (
          <View key={i} style={[s.msgRow, m.role === "user" && s.msgRowUser]}>
            <View
              style={[
                s.avatar,
                m.role === "agent" ? s.avatarAgent : s.avatarUser,
              ]}
            >
              <Text
                style={[
                  s.avatarText,
                  { color: m.role === "agent" ? "#0F6E56" : "#185FA5" },
                ]}
              >
                {m.role === "agent" ? "IA" : "Tú"}
              </Text>
            </View>
            <View
              style={[
                s.bubble,
                m.role === "user" ? s.bubbleUser : s.bubbleAgent,
              ]}
            >
              <Text
                style={[
                  s.bubbleText,
                  m.role === "user" && { color: "#185FA5" },
                ]}
              >
                {m.text}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={s.msgRow}>
            <View style={[s.avatar, s.avatarAgent]}>
              <Text style={[s.avatarText, { color: "#0F6E56" }]}>IA</Text>
            </View>
            <View style={s.bubbleAgent}>
              <ActivityIndicator size="small" color="#888" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu consulta..."
          placeholderTextColor="#aaa"
          onSubmitEditing={send}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!input.trim() || loading}
        >
          <Text style={s.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TABS = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "yolo", label: "🔍 YOLO" },
  { id: "recs", label: "📋 Recs" },
  { id: "predict", label: "🧪 Predicción" },
  { id: "chat", label: "💬 Agente" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [stations, setStations] = useState(generateStations);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.appName}>🌿 AgriMonitor</Text>
        <View style={s.onlineIndicator}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>3 estaciones</Text>
        </View>
      </View>

      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabBtnText, tab === t.id && s.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === "dashboard" && (
          <DashboardTab
            stations={stations}
            onRefresh={() => setStations(generateStations())}
          />
        )}
        {tab === "yolo" && <YoloTab />}
        {tab === "recs" && <RecsTab stations={stations} />}
        {tab === "predict" && <PredictTab />}
        {tab === "chat" && <ChatTab stations={stations} />}
      </View>
    </View>
  );
}

function PredictTab() {
  const [N, setN] = useState(0);
  const [P, setP] = useState(0);
  const [K, setK] = useState(0);
  const [temperature, setTemperature] = useState(0.0);
  const [humidity, setHumidity] = useState(0.0);
  const [ph, setPh] = useState(0.0);
  const [rainfall, setRainfall] = useState(0.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  let phFloat = parseFloat(String(ph));

  async function submit() {
    setResult(null);
    setLoading(true);
    try {
      const body = {
        n: Number(N),
        p: Number(P),
        k: Number(K),
        temperature: Number(temperature),
        humidity: Number(humidity),
        ph: Number(ph),
        rainfall: Number(rainfall),
      };

      const res = await fetch(
        "https://e5af-152-201-175-182.ngrok-free.app/predict",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log(data);
      // Esperamos { label: '...' }
      setResult(data.prediction || JSON.stringify(data));
    } catch (err) {
      console.log(err);
      setResult("Error al solicitar la predicción");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading;

  return (
    <ScrollView style={s.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={s.tabTitle}>Predicción de cultivo</Text>
      <Text style={s.tabSubtitle}>
        Rellena los campos para predecir el cultivo
      </Text>

      <View style={s.formRow}>
        <Text style={s.formLabel}>N</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={String(N)}
          onChangeText={(t) => setN(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>P</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={String(P)}
          onChangeText={(t) => setP(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>K</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={String(K)}
          onChangeText={(t) => setK(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>Temperatura (°C)</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={Number(temperature)}
          onChangeText={(t) => setTemperature(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>Humedad (%)</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={Number(humidity)}
          onChangeText={(t) => setHumidity(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>pH</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={phFloat}
          onChangeText={(t) => setPh(Number(t || 0))}
        />
      </View>

      <View style={s.formRow}>
        <Text style={s.formLabel}>Rainfall (mm)</Text>
        <TextInput
          style={s.formInput}
          keyboardType="numeric"
          value={Number(rainfall)}
          onChangeText={(t) => setRainfall(Number(t || 0))}
        />
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <TouchableOpacity
          style={[s.analyzeBtn, disabled && { opacity: 0.6 }]}
          onPress={submit}
          disabled={disabled}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.analyzeBtnText}>Predecir cultivo</Text>
          )}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={[s.resultCard, { marginTop: 16 }]}>
          <Text style={s.resultTitle}>Predicción</Text>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f4f3ef",
    paddingTop: Platform.OS === "android" ? 40 : 50,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  appName: { fontSize: 18, fontWeight: "600", color: "#222" },
  onlineIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#639922",
  },
  onlineText: { fontSize: 12, color: "#888" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#e0dfd8",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 7,
  },
  tabBtnActive: { backgroundColor: "#f4f3ef" },
  tabBtnText: { fontSize: 11, color: "#999" },
  tabBtnTextActive: { color: "#222", fontWeight: "500" },
  tabContent: { flex: 1, paddingHorizontal: 16 },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#d0cfc8",
    backgroundColor: "#fff",
    marginRight: 16,
  },
  refreshBtnText: { fontSize: 13, color: "#555" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f7f6f2",
    borderRadius: 8,
    padding: 12,
  },
  metricLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: "600" },
  stationCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e0dfd8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  stationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  stationName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stationZona: { fontSize: 11, color: "#999", marginBottom: 10 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: "500" },
  sensorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0efea",
  },
  sensorLabel: { fontSize: 13, color: "#666" },
  sensorValue: { fontSize: 13, fontWeight: "500", color: "#333" },
  uploadArea: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d0cfc8",
    borderStyle: "dashed",
    borderRadius: 12,
    minHeight: 160,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  uploadPlaceholder: { alignItems: "center", gap: 8, padding: 24 },
  uploadIcon: { fontSize: 36 },
  uploadText: { fontSize: 14, color: "#888", textAlign: "center" },
  uploadSubText: { fontSize: 12, color: "#bbb" },
  previewImage: { width: "100%", height: 200 },
  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#f0a0a0",
  },
  deleteBtnText: { fontSize: 13, color: "#E24B4A" },
  analyzeBtn: {
    flex: 1,
    backgroundColor: "#1D9E75",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  analyzeBtnText: { fontSize: 13, color: "#fff", fontWeight: "500" },
  resultCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e0dfd8",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  simBadge: {
    backgroundColor: "#faeeda",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  simBadgeText: { fontSize: 11, color: "#854F0B" },
  resultTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  detectionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    backgroundColor: "#f7f6f2",
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  confidenceText: { fontSize: 12, fontWeight: "500" },
  detectionClass: { fontSize: 13, fontWeight: "500", color: "#222" },
  detectionDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  recSection: {
    borderTopWidth: 0.5,
    borderTopColor: "#e8e8e6",
    paddingTop: 12,
    marginTop: 4,
  },
  recLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  recText: { fontSize: 13, color: "#444", lineHeight: 20 },
  loadingContainer: { alignItems: "center", paddingVertical: 32, gap: 10 },
  loadingText: { fontSize: 13, color: "#aaa" },
  recCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e0dfd8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  prioBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  prioBadgeText: { fontSize: 12, fontWeight: "500" },
  recTipo: { fontSize: 14, fontWeight: "500", color: "#222" },
  recCardText: { fontSize: 13, color: "#555", lineHeight: 20 },
  chatHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  quickRow: { maxHeight: 44, marginBottom: 8 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#d0cfc8",
    backgroundColor: "#fff",
  },
  quickBtnText: { fontSize: 12, color: "#666" },
  chatMessages: { flex: 1, paddingHorizontal: 16 },
  msgRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  msgRowUser: { flexDirection: "row-reverse" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarAgent: { backgroundColor: "#e1f5ee" },
  avatarUser: { backgroundColor: "#e6f1fb" },
  avatarText: { fontSize: 10, fontWeight: "600" },
  bubble: { maxWidth: "80%", padding: 10, borderRadius: 10 },
  bubbleAgent: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e0dfd8",
  },
  bubbleUser: { backgroundColor: "#e6f1fb" },
  bubbleText: { fontSize: 13, color: "#333", lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#e0dfd8",
    backgroundColor: "#fff",
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#d0cfc8",
    backgroundColor: "#fafaf8",
    color: "#222",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1D9E75",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  formRow: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  formLabel: { fontSize: 13, color: "#666", marginBottom: 6 },
  formInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#d0cfc8",
    backgroundColor: "#fff",
    color: "#222",
  },
});
