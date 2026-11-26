package com.sabeel.quran.seed;

import com.sabeel.quran.domain.Ayah;
import com.sabeel.quran.domain.Surah;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FullQuranLoader {
    public static final int EXPECTED_SURAHS = 114;
    public static final int EXPECTED_AYAHS = 6236;

    public record Loaded(List<Surah> surahs, List<Ayah> ayahs) {
    }

    private record Pos(int surah, int ayah) {
    }

    public Loaded load() {
        try {
            Map<Pos, String> uthmani = readText("/quran/tanzil-uthmani.txt");
            Map<Pos, String> simple = readText("/quran/tanzil-simple-clean.txt");
            Element root = readXml("/quran/tanzil-quran-data.xml");
            List<Pos> juzStarts = positions(root, "juz");
            List<Pos> quarterStarts = positions(root, "quarter");
            List<Pos> pageStarts = positions(root, "page");

            List<Surah> surahs = new ArrayList<>();
            List<Ayah> ayahs = new ArrayList<>();
            NodeList suras = root.getElementsByTagName("sura");
            int id = 0;
            for (int s = 0; s < suras.getLength(); s++) {
                Element el = (Element) suras.item(s);
                int index = Integer.parseInt(el.getAttribute("index"));
                int count = Integer.parseInt(el.getAttribute("ayas"));
                for (int a = 1; a <= count; a++) {
                    Pos pos = new Pos(index, a);
                    String u = uthmani.get(pos);
                    String t = simple.get(pos);
                    if (u == null || t == null) {
                        throw new IllegalStateException("missing text for " + index + ":" + a);
                    }
                    id++;
                    int quarter = countStartsUpTo(quarterStarts, pos);
                    ayahs.add(Ayah.builder().id(id).surahId(index).ayahNumber(a)
                            .textUthmani(u).textSimple(t)
                            .page(countStartsUpTo(pageStarts, pos))
                            .juz(countStartsUpTo(juzStarts, pos))
                            .hizb((quarter - 1) / 4 + 1)
                            .build());
                }
                Pos first = new Pos(index, 1);
                surahs.add(Surah.builder().id(index)
                        .nameAr(el.getAttribute("name"))
                        .nameEn(el.getAttribute("tname"))
                        .transliteration(el.getAttribute("ename"))
                        .revelationType("Meccan".equals(el.getAttribute("type")) ? "MAKKI" : "MADANI")
                        .ayahCount(count)
                        .startPage(countStartsUpTo(pageStarts, first))
                        .startJuz(countStartsUpTo(juzStarts, first))
                        .build());
            }
            if (surahs.size() != EXPECTED_SURAHS || ayahs.size() != EXPECTED_AYAHS) {
                throw new IllegalStateException("unexpected quran size " + surahs.size() + "/" + ayahs.size());
            }
            return new Loaded(surahs, ayahs);
        } catch (IOException | javax.xml.parsers.ParserConfigurationException | org.xml.sax.SAXException e) {
            throw new IllegalStateException("could not load bundled quran data", e);
        }
    }

    private Map<Pos, String> readText(String resource) throws IOException {
        Map<Pos, String> map = new HashMap<>();
        try (InputStream in = FullQuranLoader.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IOException("missing resource " + resource);
            }
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }
                String[] parts = line.split("\\|", 3);
                map.put(new Pos(Integer.parseInt(parts[0]), Integer.parseInt(parts[1])), parts[2].trim());
            }
        }
        return map;
    }

    private Element readXml(String resource) throws IOException, javax.xml.parsers.ParserConfigurationException, org.xml.sax.SAXException {
        try (InputStream in = FullQuranLoader.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IOException("missing resource " + resource);
            }
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            return factory.newDocumentBuilder().parse(in).getDocumentElement();
        }
    }

    private List<Pos> positions(Element root, String tag) {
        NodeList nodes = root.getElementsByTagName(tag);
        List<Pos> list = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            Element el = (Element) nodes.item(i);
            list.add(new Pos(Integer.parseInt(el.getAttribute("sura")), Integer.parseInt(el.getAttribute("aya"))));
        }
        return list;
    }

    private int countStartsUpTo(List<Pos> starts, Pos pos) {
        int count = 0;
        for (Pos start : starts) {
            if (start.surah() < pos.surah() || (start.surah() == pos.surah() && start.ayah() <= pos.ayah())) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }
}
