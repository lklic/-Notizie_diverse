#!/usr/bin/env python3
"""Build derived datasets for the website from site-data/pages.json."""
import json, collections, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
pages = json.load(open(os.path.join(HERE, "pages.json")))

# ---------------------------------------------------------------- gazetteer
# canonical modern name -> (lat, lon, region, kind)  kind: city|region|island
GAZ = {
 "Florence":(43.7696,11.2558,"Tuscany","city"),"Barcelona":(41.3874,2.1686,"Catalonia","city"),
 "Rome":(41.9028,12.4964,"Italy","city"),"Pisa":(43.7228,10.4017,"Tuscany","city"),
 "Avignon":(43.9493,4.8055,"Provence","city"),"Bologna":(44.4949,11.3426,"Italy","city"),
 "Genoa":(44.4056,8.9463,"Liguria","city"),"Milan":(45.4642,9.19,"Lombardy","city"),
 "Catalonia":(41.7,1.7,"Catalonia","region"),"Naples":(40.8518,14.2681,"Italy","city"),
 "Montpellier":(43.6108,3.8767,"France","city"),"Venice":(45.4408,12.3155,"Italy","city"),
 "Paris":(48.8566,2.3522,"France","city"),"Alexandria":(31.2001,29.9187,"Egypt","city"),
 "Valencia":(39.4699,-0.3763,"Spain","city"),"Flanders":(51.05,3.73,"Low Countries","region"),
 "London":(51.5074,-0.1278,"England","city"),"Gaeta":(41.2134,13.5713,"Italy","city"),
 "Bruges":(51.2093,3.2247,"Low Countries","city"),"England":(52.5,-1.5,"England","region"),
 "Palermo":(38.1157,13.3615,"Sicily","city"),"Seville":(37.3891,-5.9845,"Spain","city"),
 "Germany":(50.5,10.0,"Germany","region"),"Damascus":(33.5138,36.2765,"Syria","city"),
 "Siena":(43.3188,11.3308,"Tuscany","city"),"Spain":(40.0,-3.7,"Spain","region"),
 "Lucca":(43.8430,10.5079,"Tuscany","city"),"Provence":(43.9,5.8,"Provence","region"),
 "Perpignan":(42.6986,2.8956,"France","city"),"France":(47.0,2.5,"France","region"),
 "Lombardy":(45.5,9.7,"Lombardy","region"),"Aragon":(41.5,-0.9,"Spain","region"),
 "Levant":(34.0,36.0,"Levant","region"),"Cyprus":(35.0,33.4,"Levant","island"),
 "Perugia":(43.1107,12.3908,"Italy","city"),"Como":(45.8081,9.0852,"Lombardy","city"),
 "Tortosa":(40.8126,0.5214,"Catalonia","city"),"Cremona":(45.1332,10.0227,"Lombardy","city"),
 "Messina":(38.1938,15.5540,"Sicily","city"),"Toulouse":(43.6047,1.4442,"France","city"),
 "Apulia":(41.0,16.5,"Italy","region"),"Brescia":(45.5416,10.2118,"Lombardy","city"),
 "Castile":(41.0,-4.5,"Spain","region"),"Granada":(37.1773,-3.5986,"Spain","city"),
 "Majorca":(39.5696,2.6502,"Balearics","island"),"Mallorca":(39.5696,2.6502,"Balearics","island"),
 "Burgundy":(47.0,4.8,"France","region"),"Marseille":(43.2965,5.3698,"Provence","city"),
 "Ibiza":(38.9067,1.4206,"Balearics","island"),"Sardinia":(39.9,9.0,"Italy","island"),
 "Barletta":(41.3206,16.2842,"Italy","city"),"Ancona":(43.6158,13.5189,"Italy","city"),
 "Mantua":(45.1564,10.7914,"Lombardy","city"),"Malta":(35.8997,14.5146,"Malta","island"),
 "Holland":(52.2,4.9,"Low Countries","region"),"Calabria":(39.0,16.5,"Italy","region"),
 "Brussels":(50.8503,4.3517,"Low Countries","city"),"Savona":(44.3091,8.4772,"Liguria","city"),
 "Minorca":(39.9496,4.1100,"Balearics","island"),"Tunis":(36.8065,10.1815,"North Africa","city"),
 "Arles":(43.6766,4.6278,"Provence","city"),"Aigues-Mortes":(43.5667,4.1917,"Provence","city"),
 "Aleppo":(36.2021,37.1343,"Syria","city"),"Modena":(44.6471,10.9252,"Italy","city"),
 "Carpentras":(44.0556,5.0489,"Provence","city"),"Brabant":(51.0,4.6,"Low Countries","region"),
 "Turkey":(39.0,35.0,"Anatolia","region"),"Tuscany":(43.4,11.2,"Tuscany","region"),
 "Portugal":(39.5,-8.0,"Portugal","region"),"Padua":(45.4064,11.8768,"Italy","city"),
 "Caffa (Feodosia)":(45.0319,35.3824,"Black Sea","city"),"Feodosia (Caffa)":(45.0319,35.3824,"Black Sea","city"),
 "Syria":(35.0,38.0,"Levant","region"),"Lisbon":(38.7223,-9.1393,"Portugal","city"),
 "Constantinople":(41.0082,28.9784,"Anatolia","city"),"Istanbul (Constantinople)":(41.0082,28.9784,"Anatolia","city"),
 "Istanbul (Constantinople/Pera)":(41.0082,28.9784,"Anatolia","city"),"Istanbul":(41.0082,28.9784,"Anatolia","city"),
 "Famagusta":(35.1264,33.9416,"Levant","city"),"Mytilene (Lesbos)":(39.1100,26.5550,"Aegean","island"),
 "Chios":(38.3680,26.1360,"Aegean","island"),"Methoni (Modon)":(36.8197,21.7039,"Aegean","city"),
 "Thessaloniki (Salonika)":(40.6401,22.9444,"Aegean","city"),"Dubrovnik":(42.6507,18.0944,"Adriatic","city"),
 "Beirut":(33.8938,35.5018,"Levant","city"),"Bejaia (Bougie)":(36.7509,5.0567,"North Africa","city"),
 "Bougie (Bejaia)":(36.7509,5.0567,"North Africa","city"),"Annaba":(36.9000,7.7667,"North Africa","city"),
 "Algiers":(36.7538,3.0588,"North Africa","city"),"Sfax":(34.7406,10.7603,"North Africa","city"),
 "Almeria":(36.8381,-2.4597,"Spain","city"),"Almería":(36.8381,-2.4597,"Spain","city"),
 "Malaga":(36.7213,-4.4214,"Spain","city"),"Cordoba":(37.8882,-4.7794,"Spain","city"),
 "Cagliari":(39.2238,9.1217,"Italy","city"),"Bonifacio":(41.3873,9.1592,"Corsica","city"),
 "Sicily":(37.5,14.0,"Sicily","region"),"Lyon":(45.7640,4.8357,"France","city"),
 "Geneva":(46.2044,6.1432,"Switzerland","city"),"Champagne":(48.5,4.3,"France","region"),
 "Hungary":(47.0,19.5,"Hungary","region"),"Ferrara":(44.8381,11.6198,"Italy","city"),
 "Verona":(45.4384,10.9916,"Italy","city"),"Ravenna":(44.4184,12.2035,"Italy","city"),
 "Urbino":(43.7262,12.6365,"Italy","city"),"Romagna":(44.3,12.0,"Italy","region"),
 "Hormuz":(27.0590,56.4548,"Persia","city"),"Baghdad":(33.3152,44.3661,"Iraq","city"),
 "Norway":(60.5,8.5,"Scandinavia","region"),"Reims":(49.2583,4.0317,"France","city"),
 "Provins":(48.5582,3.2997,"France","city"),"Tournai":(50.6071,3.3892,"Low Countries","city"),
 "Malines (Mechelen)":(51.0259,4.4776,"Low Countries","city"),"Calais":(50.9513,1.8587,"France","city"),
 "Empoli":(43.7185,10.9468,"Tuscany","city"),"Volterra":(43.4008,10.8606,"Tuscany","city"),
 "Arezzo":(43.4633,11.8796,"Tuscany","city"),"Zaragoza":(41.6488,-0.8891,"Spain","city"),
 "Saragossa":(41.6488,-0.8891,"Spain","city"),"Teruel":(40.3456,-1.1065,"Spain","city"),
 "Murcia":(37.9922,-1.1307,"Spain","city"),"Castellón de la Plana":(39.9864,-0.0513,"Spain","city"),
 "Vila-real (Villarreal)":(39.9387,-0.1014,"Spain","city"),"Almenara":(39.7547,-0.2294,"Spain","city"),
 "Pamplona":(42.8125,-1.6458,"Spain","city"),"Navarre (valley)":(42.7,-1.6,"Spain","region"),
 "Biscay":(43.2,-2.9,"Spain","region"),"Lübeck":(53.8655,10.6866,"Germany","city"),
 "Spoleto":(42.7401,12.7356,"Italy","city"),"Scarperia":(43.9933,11.3565,"Tuscany","city"),
 "Brindisi":(40.6327,17.9418,"Italy","city"),"Salerno":(40.6824,14.7681,"Italy","city"),
 "Nola":(40.9265,14.5275,"Italy","city"),"Treviso":(45.6669,12.2433,"Italy","city"),
 "Monferrato":(45.0,8.3,"Italy","region"),"Saluzzo":(44.6469,7.4934,"Italy","city"),
 "Tortona":(44.8945,8.8643,"Italy","city"),"Monza":(45.5845,9.2744,"Lombardy","city"),
 "Trent":(46.0667,11.1167,"Italy","city"),"Lugano":(46.0037,8.9511,"Switzerland","city"),
 "Grenoble":(45.1885,5.7245,"France","city"),"Normandy":(49.2,0.4,"France","region"),
 "Chartres":(48.4439,1.4893,"France","city"),"Languedoc":(43.6,3.5,"France","region"),
 "Amalfi":(40.6340,14.6027,"Italy","city"),"Hondschoote":(50.9750,2.5847,"France","city"),
 "Montivilliers":(49.5460,0.1900,"France","city"),"Worcester":(52.1920,-2.2200,"England","city"),
 "Cotswolds":(51.8,-1.8,"England","region"),"Colombo (Ceylon)":(6.9271,79.8612,"Indian Ocean","city"),
 "India":(21.0,78.0,"India","region"),"Arabia":(24.0,45.0,"Arabia","region"),
 "Sciacca":(37.5096,13.0808,"Sicily","city"),"Padova":(45.4064,11.8768,"Italy","city"),
 "Slavonia (Dalmatia)":(43.5,17.0,"Adriatic","region"),"Lezha (Alessio)":(41.7836,19.6436,"Adriatic","city"),
 "Crema":(45.3606,9.6866,"Lombardy","city"),"Ragusa (Dubrovnik)":(42.6507,18.0944,"Adriatic","city"),
 "Barbary (North Africa)":(34.0,5.0,"North Africa","region"),"Barbary":(34.0,5.0,"North Africa","region"),
 "Barbary Coast":(34.0,5.0,"North Africa","region"),"North Africa":(34.0,5.0,"North Africa","region"),
 "Western Mediterranean":(40.0,5.0,"Mediterranean","region"),"West":(43.0,0.0,"Western Europe","region"),
 "Western Europe / Ponente":(45.0,2.0,"Western Europe","region"),"Romania (Byzantine Levant)":(40.5,26.5,"Aegean","region"),
 "Sardinia (island)":(39.9,9.0,"Italy","island"),
}

# alias raw original/normalized spellings -> canonical key
ALIAS = {
 "barzalona":"Barcelona","abarzalona":"Barcelona","jnbarzalona":"Barcelona","barzalonetta":"Barcelona","barceloneta":"Barcelona",
 "fiorenza":"Florence","firenze":"Florence","afirenze":"Florence","difirenze":"Florence","jnfirenze":"Florence",
 "avignona":"Avignon","avignone":"Avignon","vignia":"Avignon","vinegia":"Venice","vinegra":"Venice","invinegia":"Venice","avinegia":"Venice",
 "genova":"Genoa","genoba":"Genoa","genoua":"Genoa","melano":"Milan","milano":"Milan","inmelano":"Milan",
 "monpolieri":"Montpellier","monolieri":"Montpellier","inmonpolieri":"Montpellier","parigi":"Paris","inparigi":"Paris",
 "alessandria":"Alexandria","jnalessandria":"Alexandria","valenza":"Valencia","balanza":"Valencia","valanza":"Valencia",
 "fiandra":"Flanders","londra":"Londra" if False else "London","londa":"London","gaeta":"Gaeta","ghaeta":"Gaeta",
 "bruggia":"Bruges","brugia":"Bruges","inghilterra":"England","anghilterra":"England","palermo":"Palermo","palerma":"Palermo",
 "cibilia":"Seville","sibilia":"Seville","damascho":"Damascus","domaskho":"Damascus","siena":"Siena","sena":"Siena",
 "spagna":"Spain","spagnia":"Spain","lucha":"Lucca","luccha":"Lucca","perpignano":"Perpignan","perpignanj":"Perpignan",
 "francia":"France","frama":"France","lonbarda":"Lombardy","lonbardia":"Lombardy","aragona":"Aragon","dragona":"Aragon",
 "cipri":"Cyprus","perugia":"Perugia","chomo":"Como","como":"Como","tortosa":"Tortosa","cremona":"Cremona",
 "messina":"Messina","mesina":"Messina","tolosa":"Toulouse","puglia":"Apulia","brescia":"Brescia",
 "castiglia":"Castile","ghastella":"Castile","granada":"Granada","granata":"Granada","gromata":"Granada",
 "maiolicha":"Majorca","maiolica":"Majorca","maioria":"Majorca","mallorca":"Majorca","manolicha":"Majorca",
 "borghono":"Burgundy","burgogna":"Burgundy","marsilia":"Marseille","eviza":"Ibiza","iviza":"Ibiza",
 "sardigna":"Sardinia","sardesscho":"Sardinia","barletta":"Barletta","ancona":"Ancona","anghona":"Ancona",
 "mantova":"Mantua","malta":"Malta","olanda":"Holland","calabria":"Calabria","chalavria":"Calabria",
 "brusella":"Brussels","borsella":"Brussels","saona":"Savona","minorgha":"Minorca","minoricha":"Minorca",
 "tunizi":"Tunis","tunisi":"Tunis","aleppi":"Aleppo","alepi":"Aleppo","modena":"Modena","padova":"Padua",
 "portoghallo":"Portugal","chaffa":"Caffa (Feodosia)","gaffa":"Caffa (Feodosia)","soria":"Syria","soriana":"Syria",
 "lismona":"Lisbon","lisbona":"Lisbon","costantinopoli":"Constantinople","chostantinopoli":"Constantinople",
 "missopontinopoli":"Constantinople","famagosta":"Famagusta","metellino":"Mytilene (Lesbos)","modone":"Methoni (Modon)",
 "ssalomonchi":"Thessaloniki (Salonika)","ragona":"Dubrovnik","beirut":"Beirut","buggiea":"Bejaia (Bougie)","buggia":"Bougie (Bejaia)",
 "bona":"Annaba","dalghune":"Algiers","ffaculo":"Sfax","almeria":"Almería","almeri":"Almería","malicha":"Malaga","dordovera":"Cordoba",
 "cassero":"Cagliari","boniffaro":"Bonifacio","sicilia":"Sicily","lunga":"Lyon","ginevra":"Geneva","champagna":"Champagne",
 "ungheria":"Hungary","ferrara":"Ferrara","verona":"Verona","ravenna":"Ravenna","urbino":"Urbino","romagna":"Romagna",
 "ormoba":"Hormuz","bonghaddo":"Baghdad","norvegia":"Norway","dranco":"Reims","provno":"Provins","dironis":"Tournai",
 "mellina":"Malines (Mechelen)","gallesono":"Calais","enpoli":"Empoli","ampoli":"Empoli","soraoghosa":"Zaragoza",
 "terunolo":"Teruel","gterunolo":"Teruel","murya":"Murcia","chastighone":"Castellón de la Plana","villa reale":"Vila-real (Villarreal)",
 "almenara":"Almenara","tortonda":"Tortona","monsa":"Monza","trento":"Trent","lughano":"Lugano","tolosino":"Toulouse",
 "barbaresche":"Barbary (North Africa)","barberesche":"Barbary (North Africa)","barbarescho":"Barbary (North Africa)",
 "barbarescha":"Barbary (North Africa)","barberia":"Barbary (North Africa)","ponente":"West","levante":"Levant","dilevante":"Levant",
 "alemagna":"Germany","lamagna":"Germany","calogiere":None,"siagonone":"Sciacca","romania":"Romania (Byzantine Levant)",
 "schiavonia":"Slavonia (Dalmatia)","amalicha":"Amalfi","colonbino":"Colombo (Ceylon)","biçava":"Biscay",
}

def clean(name):
    if not name: return ""
    s = re.sub(r"\[.*?\]","",name)              # drop [?] etc
    s = re.sub(r"\(.*?\)","",s)                   # drop parentheticals
    s = s.split("/")[0]                            # first variant
    return s.strip().strip("'’ ").lower()

def resolve(name):
    """Return canonical gazetteer key or None."""
    if not name: return None
    raw = name.strip()
    # direct canonical hit
    for k in (raw, raw.title()):
        if k in GAZ: return k
    c = clean(name)
    if c in ALIAS:
        return ALIAS[c]
    # alias by first word
    first = c.split()[0] if c.split() else c
    if first in ALIAS: return ALIAS[first]
    # title-case canonical
    tc = c.title()
    if tc in GAZ: return tc
    return None

# ----------------------------------------------------- PLACES (geocoded)
places = {}   # canonical -> record
unmapped = collections.Counter()
for p in pages:
    for pl in p["entities"]["places"]:
        cand = pl.get("modern") or pl.get("normalized") or pl.get("original")
        key = resolve(cand) or resolve(pl.get("original",""))
        if not key or key not in GAZ:
            unmapped[(pl.get("modern") or pl.get("normalized") or pl.get("original"))]+=1
            continue
        lat,lon,region,kind = GAZ[key]
        r = places.setdefault(key, {"name":key,"lat":lat,"lon":lon,"region":region,"kind":kind,
                                     "count":0,"pages":set(),"originals":set(),"roles":collections.Counter()})
        r["count"]+=1; r["pages"].add(p["image"]); r["originals"].add(pl.get("original",""))
        if pl.get("role"): r["roles"][pl["role"]]+=1
places_out=[]
for k,r in places.items():
    r["pages"]=sorted(r["pages"]); r["originals"]=sorted(x for x in r["originals"] if x)[:6]
    r["roles"]=dict(r["roles"])
    places_out.append(r)
places_out.sort(key=lambda r:-r["count"])
json.dump(places_out, open(os.path.join(HERE,"places.json"),"w"), ensure_ascii=False, indent=1)

# ----------------------------------------------------- ROUTES (edges)
edges = collections.defaultdict(lambda:{"count":0,"examples":[]})
raw_edges=0
for p in pages:
    for cv in p["entities"]["conversions"]:
        a=resolve(cv.get("from","")); b=resolve(cv.get("to",""))
        raw_edges+=1
        if not a or not b or a==b or a not in GAZ or b not in GAZ: continue
        key=tuple(sorted([a,b]))
        e=edges[key]; e["count"]+=1
        if len(e["examples"])<5:
            e["examples"].append({"page":p["image"],"from":cv.get("from"),"to":cv.get("to"),
                                  "what":cv.get("what"),"value":cv.get("value")})
routes_out=[{"a":k[0],"b":k[1],"count":v["count"],"examples":v["examples"]} for k,v in edges.items()]
routes_out.sort(key=lambda r:-r["count"])
json.dump(routes_out, open(os.path.join(HERE,"routes.json"),"w"), ensure_ascii=False, indent=1)

# ----------------------------------------------------- COMMODITIES
comm=collections.defaultdict(lambda:{"count":0,"category":"","pages":set(),"originals":set()})
for p in pages:
    for c in p["entities"]["commodities"]:
        name=(c.get("english") or c.get("original") or "").strip().lower()
        if not name: continue
        r=comm[name]; r["count"]+=1; r["category"]=c.get("category","other")
        r["pages"].add(p["image"]); r["originals"].add(c.get("original",""))
comm_out=[]
for k,r in comm.items():
    comm_out.append({"name":k,"category":r["category"],"count":r["count"],
                     "pages":sorted(r["pages"]),"originals":sorted(x for x in r["originals"] if x)[:6]})
comm_out.sort(key=lambda r:-r["count"])
json.dump(comm_out, open(os.path.join(HERE,"commodities.json"),"w"), ensure_ascii=False, indent=1)

# ----------------------------------------------------- SECTIONS + page index
SECTION_LABELS={
 "front-matter":"Front matter","wool-gazetteer":"Wool gazetteers","spice-gazetteer":"Spice & drug notes",
 "ragguagli":"Ragguagli (exchange tables)","cloth-dye":"Cloth & dye references","coinage-assay":"Coinage assays",
 "metrology-cambio":"Metrology & cambio","regional-survey":"Italian regional survey","fairs-usances":"Fairs & bill usances",
 "statute":"Pisan customs statute","maritime-galley":"Galley memoranda","blank-binding":"Blanks & binding","other":"Other",
}
sections=collections.OrderedDict()
index=[]
for p in pages:
    sec=p["section"]
    sections.setdefault(sec,{"key":sec,"label":SECTION_LABELS.get(sec,sec),"pages":[]})
    sections[sec]["pages"].append(p["image"])
    index.append({"image":p["image"],"folio":p.get("folio"),"topic":p.get("topic"),
                  "section":sec,"is_blank":p["is_blank"],
                  "n_places":len(p["entities"]["places"]),"n_commodities":len(p["entities"]["commodities"]),
                  "n_conversions":len(p["entities"]["conversions"])})
json.dump(list(sections.values()), open(os.path.join(HERE,"sections.json"),"w"), ensure_ascii=False, indent=1)
json.dump(index, open(os.path.join(HERE,"index.json"),"w"), ensure_ascii=False, indent=1)

print(f"places geocoded: {len(places_out)}  (place mentions mapped)")
print(f"  top: {[ (r['name'],r['count']) for r in places_out[:12] ]}")
print(f"unmapped distinct place readings: {len(unmapped)} (mostly uncertain one-offs)")
print(f"routes: {len(routes_out)} unique edges from {raw_edges} raw conversions")
print(f"  top edges: {[ (r['a'],r['b'],r['count']) for r in routes_out[:10] ]}")
print(f"commodities: {len(comm_out)} distinct; categories present")
print(f"sections: {[ (s['key'],len(s['pages'])) for s in sections.values() ]}")
