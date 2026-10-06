import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { como, contar, crearBase, ID } from "./setup.ts";

let db: PGlite;
before(async () => {
  db = await crearBase();
});

const RLS = /row-level security|permission denied/;

describe("público (anónimo)", () => {
  test("ve solo propiedades publicadas, de todas las agencias", async () => {
    const ids = await como(db, "anon", async (tx) =>
      (await tx.query<{ id: string }>("select id from properties order by id")).rows.map((r) => r.id),
    );
    assert.deepEqual(ids, [ID.pubA, ID.pubB]);
  });

  test("ve los datos de las agencias", async () => {
    assert.equal(await como(db, "anon", (tx) => contar(tx, "select * from agencies")), 2);
  });

  test("no ve fotos, escenas, hotspots ni planos de borradores", async () => {
    await como(db, "anon", async (tx) => {
      assert.equal(await contar(tx, "select * from property_photos"), 2);
      assert.equal(await contar(tx, "select * from tour_scenes"), 2);
      assert.equal(await contar(tx, "select * from tour_hotspots"), 1);
      assert.equal(await contar(tx, "select * from property_plans"), 1);
      assert.equal(await contar(tx, "select * from plan_hotspots"), 1);
    });
  });

  test("no puede crear, editar ni borrar propiedades", async () => {
    await assert.rejects(
      como(db, "anon", (tx) =>
        tx.query(
          `insert into properties (agency_id, titulo, slug, operacion, tipo) values ($1, 'x', 'x', 'venta', 'casa')`,
          [ID.agenciaA],
        ),
      ),
      RLS,
    );
    await assert.rejects(como(db, "anon", (tx) => tx.query("update properties set titulo = 'hack'")), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query("delete from properties")), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query("update agencies set nombre = 'hack'")), RLS);
  });

  test("no puede crear leads directo: entran solo por el servidor", async () => {
    await assert.rejects(
      como(db, "anon", (tx) =>
        tx.query(`insert into leads (agency_id, property_id, nombre, telefono) values ($1, $2, 'X', '1122')`, [ID.agenciaA, ID.pubA]),
      ),
      RLS,
    );
  });

  test("la base valida los leads que crea el servidor", async () => {
    const insertar = (columnas: string, valores: string) =>
      como(db, "servicio", (tx) => tx.query(`insert into leads (agency_id, ${columnas}) values ($1, ${valores})`, [ID.agenciaA]));
    for (const valores of ["null, '1122'", "'Eva', null", "'  ', 'a@b.com'"]) {
      await assert.rejects(insertar("nombre, telefono", valores), /check constraint/);
    }
    await assert.rejects(insertar("nombre, telefono, origen", "'Eva', null, 'pedido_visita'"), /check constraint/);
    await assert.rejects(insertar("nombre, origen", "null, 'link_personalizado'"), /check constraint/);
    await assert.rejects(insertar("codigo_ref, origen", "'a7', 'whatsapp_click'"), /check constraint/);
    await insertar("nombre, telefono, origen", "'Eva', '1122', 'pedido_visita'");
    await insertar("codigo_ref, origen", "'Q4W8', 'whatsapp_click'");
  });

  test("no puede leer consultas ni miembros", async () => {
    await assert.rejects(como(db, "anon", (tx) => tx.query("select * from leads")), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query("select * from agency_members")), RLS);
    for (const tabla of ["visitors", "visitor_events", "visit_requests", "tracked_links"]) {
      await assert.rejects(como(db, "anon", (tx) => tx.query(`select * from ${tabla}`)), RLS, tabla);
    }
    await assert.rejects(como(db, "anon", (tx) => tx.query("select * from estadisticas_propiedades(now() - interval '30 days')")), RLS);
  });
});

describe("miembros de una agencia", () => {
  test("ven los borradores de su agencia pero no los de otra", async () => {
    const ids = await como(db, "agenteA", async (tx) =>
      (await tx.query<{ id: string }>("select id from properties order by id")).rows.map((r) => r.id),
    );
    assert.deepEqual(ids, [ID.pubA, ID.borradorA, ID.pubB]);
    assert.equal(
      await como(db, "adminB", (tx) => contar(tx, "select * from tour_scenes where property_id = $1", [ID.borradorA])),
      0,
    );
  });

  test("crean propiedades en su agencia, no en otra", async () => {
    await como(db, "agenteA", (tx) =>
      tx.query(`insert into properties (agency_id, titulo, slug, operacion, tipo) values ($1, 'Nueva', 'nueva', 'venta', 'casa')`, [
        ID.agenciaA,
      ]),
    );
    await assert.rejects(
      como(db, "agenteA", (tx) =>
        tx.query(`insert into properties (agency_id, titulo, slug, operacion, tipo) values ($1, 'X', 'x', 'venta', 'casa')`, [
          ID.agenciaB,
        ]),
      ),
      RLS,
    );
  });

  test("no editan ni borran propiedades de otra agencia, ni se las pasan", async () => {
    await como(db, "agenteA", async (tx) => {
      assert.equal((await tx.query("update properties set titulo = 'hack' where id = $1", [ID.pubB])).affectedRows, 0);
      assert.equal((await tx.query("delete from properties where id = $1", [ID.pubB])).affectedRows, 0);
      assert.equal((await tx.query("delete from tour_scenes where property_id = $1", [ID.borradorB])).affectedRows, 0);
    });
    await assert.rejects(
      como(db, "agenteA", (tx) => tx.query("update properties set agency_id = $1 where id = $2", [ID.agenciaB, ID.pubA])),
      RLS,
    );
  });

  test("no cuelgan fotos, escenas ni planos de propiedades ajenas", async () => {
    await assert.rejects(
      como(db, "agenteA", (tx) =>
        tx.query("insert into property_photos (property_id, url) values ($1, 'https://x/y.webp')", [ID.pubB]),
      ),
      RLS,
    );
    await assert.rejects(
      como(db, "agenteA", (tx) =>
        tx.query("insert into tour_scenes (property_id, nombre_ambiente, panorama_url) values ($1, 'X', 'u')", [
          ID.borradorB,
        ]),
      ),
      RLS,
    );
  });

  test("editan fotos, escenas, hotspots y planos de su agencia", async () => {
    await como(db, "agenteA", async (tx) => {
      await tx.query("insert into property_photos (property_id, url, orden) values ($1, 'https://x/4.webp', 2)", [ID.pubA]);
      assert.equal(
        (await tx.query("update tour_scenes set yaw_inicial = 45 where id = $1", [ID.escenaPubA1])).affectedRows,
        1,
      );
      await tx.query("insert into tour_hotspots (scene_id, target_scene_id, yaw, pitch) values ($1, $2, -90, 0)", [
        ID.escenaPubA2,
        ID.escenaPubA1,
      ]);
      assert.equal((await tx.query("delete from plan_hotspots where plan_id = $1", [ID.planoPubA])).affectedRows, 1);
    });
  });

  test("ven y borran solo las consultas de su agencia", async () => {
    await como(db, "agenteA", async (tx) => {
      assert.equal(await contar(tx, "select * from leads"), 2);
      assert.equal((await tx.query("delete from leads where agency_id = $1", [ID.agenciaB])).affectedRows, 0);
    });
  });

  test("solo el admin edita la agencia, y solo la suya", async () => {
    await como(db, "agenteA", async (tx) => {
      assert.equal((await tx.query("update agencies set color_primario = '#000000'")).affectedRows, 0);
    });
    await como(db, "adminA", async (tx) => {
      assert.equal((await tx.query("update agencies set color_primario = '#112233'")).affectedRows, 1);
    });
  });

  test("solo el admin gestiona miembros; un agente no se asciende", async () => {
    await como(db, "agenteA", async (tx) => {
      assert.equal(await contar(tx, "select * from agency_members"), 2);
      assert.equal(
        (await tx.query("update agency_members set rol = 'admin' where user_id = $1", [ID.agenteA])).affectedRows,
        0,
      );
    });
    await assert.rejects(
      como(db, "agenteA", (tx) =>
        tx.query("insert into agency_members (user_id, agency_id, rol) values ($1, $2, 'admin')", [ID.agenteA, ID.agenciaB]),
      ),
      RLS,
    );
    await como(db, "adminA", async (tx) => {
      assert.equal(
        (await tx.query("update agency_members set rol = 'admin' where user_id = $1", [ID.agenteA])).affectedRows,
        1,
      );
    });
  });
});

describe("integridad", () => {
  test("un hotspot del tour no puede apuntar a otra propiedad", async () => {
    await assert.rejects(
      como(db, "adminA", (tx) =>
        tx.query("insert into tour_hotspots (scene_id, target_scene_id, yaw, pitch) values ($1, $2, 0, 0)", [
          ID.escenaPubA1,
          ID.escenaBorradorA,
        ]),
      ),
      /misma propiedad/,
    );
  });

  test("un punto del plano no puede abrir una escena de otra propiedad", async () => {
    await assert.rejects(
      como(db, "adminA", (tx) =>
        tx.query("insert into plan_hotspots (plan_id, x_pct, y_pct, texto, scene_id) values ($1, 10, 10, 'X', $2)", [
          ID.planoPubA,
          ID.escenaBorradorA,
        ]),
      ),
      /misma propiedad/,
    );
  });

  test("marcar una foto como principal desmarca la anterior", async () => {
    const principales = await como(db, "adminA", async (tx) => {
      await tx.query("update property_photos set es_principal = true where id = $1", [ID.fotoPubA2]);
      return (
        await tx.query<{ id: string }>("select id from property_photos where property_id = $1 and es_principal", [ID.pubA])
      ).rows.map((r) => r.id);
    });
    assert.deepEqual(principales, [ID.fotoPubA2]);
  });

  test("editar una propiedad actualiza updated_at", async () => {
    await como(db, "adminA", async (tx) => {
      await tx.query("update properties set updated_at = '2000-01-01' where id = $1", [ID.pubA]);
      const { rows } = await tx.query<{ viejo: boolean }>(
        "select updated_at < now() - interval '1 day' as viejo from properties where id = $1",
        [ID.pubA],
      );
      assert.equal(rows[0].viejo, false);
    });
  });

  test("borrar los datos de ejemplo arrastra fotos, tour y planos", async () => {
    await como(db, "adminA", async (tx) => {
      assert.equal((await tx.query("delete from properties where es_demo")).affectedRows, 1);
      assert.equal(await contar(tx, "select * from tour_scenes where property_id = $1", [ID.pubA]), 0);
      assert.equal(await contar(tx, "select * from property_photos where property_id = $1", [ID.pubA]), 0);
      assert.equal(await contar(tx, "select * from plan_hotspots where plan_id = $1", [ID.planoPubA]), 0);
    });
  });

  test("slug con formato inválido o repetido se rechaza", async () => {
    await assert.rejects(
      como(db, "adminA", (tx) =>
        tx.query(`insert into properties (agency_id, titulo, slug, operacion, tipo) values ($1, 'X', 'Con Espacios', 'venta', 'casa')`, [
          ID.agenciaA,
        ]),
      ),
      /check constraint/,
    );
    await assert.rejects(
      como(db, "adminA", (tx) =>
        tx.query(`insert into properties (agency_id, titulo, slug, operacion, tipo) values ($1, 'X', 'borrador-a', 'venta', 'casa')`, [
          ID.agenciaA,
        ]),
      ),
      /duplicate key/,
    );
  });
});

describe("storage", () => {
  const subir = (bucket: string, ruta: string) =>
    `insert into storage.objects (bucket_id, name) values ('${bucket}', '${ruta}')`;

  test("existen los tres buckets públicos con límites", async () => {
    const { rows } = await db.query<{ id: string; public: boolean; file_size_limit: number }>(
      "select id, public, file_size_limit from storage.buckets order by id",
    );
    assert.deepEqual(
      rows.map((r) => [r.id, r.public]),
      [["fotos", true], ["panoramas", true], ["planos", true]],
    );
    assert.ok(rows.every((r) => Number(r.file_size_limit) > 0));
  });

  test("un miembro sube, lista y borra en la carpeta de su agencia", async () => {
    await como(db, "agenteA", async (tx) => {
      await tx.query(subir("panoramas", `${ID.agenciaA}/${ID.pubA}/living.jpg`));
      assert.equal(await contar(tx, "select * from storage.objects"), 1);
      assert.equal((await tx.query("delete from storage.objects")).affectedRows, 1);
    });
  });

  test("nadie sube a la carpeta de otra agencia, a otro bucket o a una ruta sin agencia", async () => {
    for (const sql of [
      subir("fotos", `${ID.agenciaB}/${ID.pubB}/x.webp`),
      subir("fotos", `sin-agencia/x.webp`),
      subir("fotos", `x.webp`),
    ]) {
      await assert.rejects(como(db, "agenteA", (tx) => tx.query(sql)), RLS);
    }
    await db.query("insert into storage.buckets (id, name) values ('otro', 'otro') on conflict do nothing");
    await assert.rejects(como(db, "adminA", (tx) => tx.query(subir("otro", `${ID.agenciaA}/x.webp`))), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query(subir("fotos", `${ID.agenciaA}/x.webp`))), RLS);
  });

  test("un miembro no ve ni borra archivos de otra agencia", async () => {
    await db.query(subir("fotos", `${ID.agenciaB}/${ID.pubB}/b.webp`));
    await como(db, "agenteA", async (tx) => {
      assert.equal(await contar(tx, "select * from storage.objects"), 0);
      assert.equal((await tx.query("delete from storage.objects")).affectedRows, 0);
    });
    assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
  });
});

describe("búsqueda", () => {
  test("encuentra sin tildes ni mayúsculas y no expone direcciones ocultas", async () => {
    const ids = await como(db, "adminA", async (tx) => {
      await tx.query(
        `insert into properties (id, agency_id, titulo, slug, operacion, tipo, barrio, direccion, mostrar_direccion_exacta, publicada)
         values ('20000000-0000-4000-8000-0000000000e1', $1, 'Luminoso', 'luminoso', 'venta', 'departamento', 'Núñez', 'Cuba 3100', false, true),
                ('20000000-0000-4000-8000-0000000000e2', $1, 'Casa', 'casa-x', 'venta', 'casa', 'Belgrano', 'Cuba 2200', true, true)`,
        [ID.agenciaA],
      );
      const buscar = async (q: string) =>
        (await tx.query<{ slug: string }>("select slug from properties where busqueda like $1 order by slug", [`%${q}%`])).rows.map(
          (r) => r.slug,
        );
      return { nunez: await buscar("nunez"), depto: await buscar("depto"), cuba: await buscar("cuba") };
    });
    assert.deepEqual(ids.nunez, ["luminoso"]);
    assert.ok(ids.depto.includes("luminoso"));
    assert.deepEqual(ids.cuba, ["casa-x"]);
  });
});

describe("pre-visita y calificación", () => {
  test("cada agencia ve solo sus visitantes, eventos, pedidos de visita y links", async () => {
    for (const [usuario, propios] of [["agenteA", ID.visitanteA], ["adminB", ID.visitanteB]] as const) {
      await como(db, usuario, async (tx) => {
        const visitantes = (await tx.query<{ id: string }>("select id from visitors")).rows.map((r) => r.id);
        assert.deepEqual(visitantes, [propios]);
        const eventos = (await tx.query<{ visitor_id: string }>("select distinct visitor_id from visitor_events")).rows;
        assert.deepEqual(eventos.map((e) => e.visitor_id), [propios]);
      });
    }
    await como(db, "agenteA", async (tx) => {
      assert.equal(await contar(tx, "select * from visit_requests"), 1);
      assert.equal(await contar(tx, "select * from tracked_links"), 1);
    });
    await como(db, "adminB", async (tx) => {
      assert.equal(await contar(tx, "select * from visit_requests"), 0);
      assert.equal(await contar(tx, "select * from tracked_links"), 0);
    });
  });

  test("un miembro cambia estado y notas, pero no el puntaje ni leads ajenos", async () => {
    await como(db, "agenteA", async (tx) => {
      const r = await tx.query("update leads set estado = 'contactado', notas = 'Llamar el lunes' where id = $1", [ID.leadVisitanteA]);
      assert.equal(r.affectedRows, 1);
    });
    await assert.rejects(como(db, "agenteA", (tx) => tx.query("update leads set score = 100 where id = $1", [ID.leadVisitanteA])), RLS);
    await como(db, "adminB", async (tx) => {
      assert.equal((await tx.query("update leads set estado = 'descartado' where id = $1", [ID.leadVisitanteA])).affectedRows, 0);
    });
  });

  test("nadie con sesión escribe eventos ni visitantes (solo el servidor)", async () => {
    await assert.rejects(
      como(db, "adminA", (tx) =>
        tx.query("insert into visitor_events (visitor_id, agency_id, property_id, tipo) values ($1, $2, $3, 'tour_complete')", [ID.visitanteA, ID.agenciaA, ID.pubA]),
      ),
      RLS,
    );
    await assert.rejects(
      como(db, "adminA", (tx) => tx.query("insert into visitors (agency_id, codigo_ref) values ($1, 'ZZ99')", [ID.agenciaA])),
      RLS,
    );
  });

  test("un solo lead por visitante e inmobiliaria", async () => {
    await assert.rejects(
      como(db, "servicio", (tx) =>
        tx.query("insert into leads (agency_id, visitor_id, origen) values ($1, $2, 'whatsapp_click')", [ID.agenciaA, ID.visitanteA]),
      ),
      /duplicate key/,
    );
  });

  test("estadísticas por propiedad: solo con eventos de la propia agencia", async () => {
    const consulta = "select * from estadisticas_propiedades(now() - interval '30 days') where property_id = $1";
    const deA = await como(db, "adminA", async (tx) => (await tx.query<Record<string, string | number>>(consulta, [ID.pubA])).rows[0]);
    assert.equal(Number(deA.vistas), 1);
    assert.equal(Number(deA.visitantes), 1);
    assert.equal(Number(deA.tours_iniciados), 1);
    assert.equal(Number(deA.segundos_tour_promedio), 70);
    assert.equal(Number(deA.pedidos_visita), 1);
    const deB = await como(db, "adminB", async (tx) => (await tx.query<Record<string, string | number>>(consulta, [ID.pubA])).rows[0]);
    assert.equal(Number(deB.vistas), 0);
    assert.equal(Number(deB.pedidos_visita), 0);
  });

  test("borrar un visitante borra sus eventos y deja el lead sin historial", async () => {
    await como(db, "servicio", async (tx) => {
      await tx.query("delete from visitors where id = $1", [ID.visitanteA]);
      assert.equal(await contar(tx, "select * from visitor_events where visitor_id = $1", [ID.visitanteA]), 0);
      const { rows } = await tx.query<{ visitor_id: string | null }>("select visitor_id from leads where id = $1", [ID.leadVisitanteA]);
      assert.equal(rows[0].visitor_id, null);
    });
  });
});
