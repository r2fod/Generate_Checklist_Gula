import csv
import json

months = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12
}

def deducir_tipo(titulo):
    txt = titulo.lower()
    # 1. Vacaciones y ausencias
    if any(k in txt for k in ["operacion", "operación", "médico", "medico", "cita", "revision", "libra", "itv", "vacaciones", "descanso", "jubilacion", "jubilación"]): return "vacaciones"
    
    # 2. Recogidas y logística
    if any(k in txt for k in ["recoger", "recogida", "devolucion", "devolución", "devolver", "descarga", "carga "]): return "recogida"
    
    # 3. Tareas, reuniones, preparativos
    if any(k in txt for k in ["reunion", "reunión", "reu ", "visita", "tarea", "cata", "prueba", "visu", "llamar", "llamada", "inventario", "comprar", "compra ", "limpiar", "preparacion", "preparar", "organizar", "montar", "montaje", "cobrar", "acta", "reparar", "reparacion", "fotos", "sesion de fotos", "charla", "gestor", "contabilidad", "despedida marieta", "despedida anna", "desipedida anna", "inauguracion suuik", "inauguración suuik", "inauguracion tot", "inauguración tot"]): return "tarea"
    
    # 4. Bodas y celebraciones
    if any(k in txt for k in ["boda", "casamiento", "pedida", "despedida"]): return "boda"
    if any(k in txt for k in ["comunion", "comunión", "bautizo"]): return "comunion"
    if "cumple" in txt: return "cumpleanos"
    
    # 5. Producciones (rodajes, sesiones)
    if any(k in txt for k in ["rodaje", "rojade", "produccion", "producción", "produ ", "shooting"]): return "produccion"
    
    # 6. Corporativos y otros eventos
    if any(k in txt for k in ["evento", "corporativo", "empresa", "presentacion", "presentación", "taller", "cena", "comida", "inauguracion", "inauguración", "cocktail", "almuerzo", "encamina", "poalgi", "tezenis", "sothebys", "vampire", "suot"]): return "corporativo"
    
    # 7. Cerrado
    if any(k in txt for k in ["cerrado", "festivo"]): return "cerrado"
    
    return "tarea" # Default

def parse_calendar(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        reader = list(csv.reader(f))

    events = []
    
    def parse_grid(start_col):
        current_month = None
        active_month = None
        last_num = 0
        day_mapping = {}
        
        for r, row in enumerate(reader):
            while len(row) < 20: row.append("")
            
            # Buscamos mes
            cell_val = row[start_col].upper()
            for m_name, m_num in months.items():
                if m_name in cell_val:
                    current_month = m_num
                    day_mapping = {} # reset
                    last_num = 0
                    active_month = None
                    break
            
            # Buscamos números de días de la semana (1 al 31)
            is_week_header = False
            temp_mapping = {}
            for c in range(start_col, start_col + 7):
                val = row[c].strip()
                if val.isdigit():
                    num = int(val)
                    if 1 <= num <= 31:
                        is_week_header = True
                        
                        if last_num == 0:
                            # Primer número de toda la cuadrícula del mes
                            if num > 15:
                                active_month = current_month - 1
                                if active_month == 0: active_month = 12
                            else:
                                active_month = current_month
                        else:
                            # Si el número baja de golpe (ej. de 31 a 1), cambiamos de mes
                            if num < last_num:
                                active_month += 1
                                if active_month == 13: active_month = 1
                        
                        last_num = num
                        
                        # Determinar año
                        y = 2026
                        if active_month == 12 and current_month == 1: y = 2025
                        if active_month == 1 and current_month == 12: y = 2027
                        
                        temp_mapping[c] = (num, active_month, y)
            
            if is_week_header and current_month:
                day_mapping = temp_mapping
                continue
                
            if day_mapping and current_month:
                for c, info in day_mapping.items():
                    day_num, m_num, y_num = info
                    event_text = row[c].strip()
                    if event_text:
                        txt_upper = event_text.upper()
                        # Filtrar turnos de trabajo o textos basura
                        skip_keywords = ["LIBRA ", "LIBRE", "VACAS", "TRABAJA", "LIMPIEZA", "COCINA", "ACTIVA", "ANTO:", "MARC ", "JEFFER"]
                        skip = False
                        if txt_upper == "R" or txt_upper == "COCINA": skip = True
                        for k in skip_keywords:
                            if k in txt_upper:
                                skip = True
                                break
                                
                        if not skip:
                            tipo = deducir_tipo(event_text)
                            date_str = f"{y_num}-{m_num:02d}-{day_num:02d}"
                            events.append({
                                "fecha": date_str,
                                "titulo": event_text,
                                "tipo": tipo
                            })

    parse_grid(2)
    parse_grid(10)
    return events

events = parse_calendar('/Users/raul/.gemini/antigravity-ide/brain/ef0c9b55-b8bf-4684-9f1e-b6c47af860fd/scratch/calendar_2026.csv')

seen = set()
dedup_events = []
for e in events:
    key = (e['fecha'], e['titulo'].lower().strip())
    if key not in seen:
        seen.add(key)
        dedup_events.append(e)

with open('/Users/raul/.gemini/antigravity-ide/brain/ef0c9b55-b8bf-4684-9f1e-b6c47af860fd/scratch/parsed_events.json', 'w', encoding='utf-8') as f:
    json.dump(dedup_events, f, ensure_ascii=False, indent=2)

print(f"Generated JSON with {len(dedup_events)} events.")
