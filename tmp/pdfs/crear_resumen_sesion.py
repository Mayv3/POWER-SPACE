from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak


OUTPUT = r"C:\Users\nicop\OneDrive\Desktop\Proyectos\POWER-SPACE\output\pdf\cambios-powerspace-sesion-2026-08-21.pdf"

INK = HexColor('#202B3A')
MUTED = HexColor('#617184')
GOLD = HexColor('#A87822')
FOOT = HexColor('#8491A0')


styles = getSampleStyleSheet()
title = ParagraphStyle(
    'title', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=27,
    leading=32, textColor=INK, alignment=TA_CENTER, spaceAfter=7,
)
subtitle = ParagraphStyle(
    'subtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=12,
    leading=16, textColor=MUTED, alignment=TA_CENTER, spaceAfter=27,
)
section = ParagraphStyle(
    'section', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=15,
    leading=19, textColor=GOLD, spaceBefore=0, spaceAfter=6,
)
body = ParagraphStyle(
    'body', parent=styles['BodyText'], fontName='Helvetica', fontSize=11.5,
    leading=17, textColor=INK, spaceAfter=20,
)


def block(head, text):
    return [Paragraph(head, section), Paragraph(text, body)]


story = [
    Spacer(1, 25 * mm),
]

story += block(
    'Vista pública y tanda en vivo',
    'La lista de atletas de la tanda conserva el orden de plataforma definido en Cargadores y se sincroniza en vivo cuando ese orden cambia. Ya no se reorganiza por total, DOTS ni nuevos intentos. Cada tarjeta muestra la categoría, el estado en tanda, el peso a tirar, el total acumulado y el puesto que alcanzaría dentro de su categoría si ese levantamiento resulta válido.'
)
story += block(
    'Pantalla para monitor vertical',
    'La vista pública incorpora modo pantalla completa para el uso en monitores verticales. Se activa al presionar el bloque superior EN VIVO junto a la fecha; no se muestra como botón independiente ni se activa en móviles.'
)
story += block(
    'Cargadores e Intentos sincronizados',
    'Intentos adopta automáticamente la tanda seleccionada en Cargadores y respeta su mismo orden de atletas. Las modificaciones de peso ya no esperan una recarga completa: la fila afectada se actualiza apenas llega el evento en tiempo real y recalcula total y puesto localmente.'
)
story += block(
    'Señales de jueces y presentación',
    'En la vista de plataforma, un nulo tipo 1 ahora muestra también su tarjeta roja debajo de la luz, igual que los tipos azul y amarillo. La presentación visual del atleta se extendió a 6 segundos antes de su salida gradual.'
)

story.append(PageBreak())
story += [Spacer(1, 18 * mm)]
story += block(
    'Rack abierto y cerrado',
    'Todos los selectores de rack ofrecen posiciones 1 a 30 y también 1C a 30C para posiciones cerradas. Los valores cerrados se guardan de forma compatible con los datos existentes y se ven siempre con la C en el formulario de atletas, Intentos y Cargadores. La validación del servidor admite ambas series.'
)
story += block(
    'Formulario de atletas',
    'El selector de categorías de edad ahora muestra un check visible junto a cada categoría elegida. Esto facilita identificar la categoría principal y una segunda categoría cuando el atleta compite en ambas.'
)
story += block(
    'Tabla de intentos',
    'La columna Atleta quedó alineada a la izquierda para mejorar la lectura de nombres. Además, la tabla conserva el contexto de tanda y orden proveniente de Cargadores, incluso al navegar entre ambas pantallas.'
)
story += block(
    'Legibilidad en tanda en vivo',
    'Las tarjetas públicas de los competidores se ampliaron: nombre, categoría, lote, estado, próximo atleta, peso a tirar, puesto proyectado y total se leen con mayor tamaño y más espacio interno.'
)
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    rightMargin=27 * mm,
    leftMargin=27 * mm,
    topMargin=24 * mm,
    bottomMargin=30 * mm,
    title='Cambios POWERSPACE - Sesión 21 de agosto de 2026',
    author='POWERSPACE',
)
doc.build(story)
print(OUTPUT)
