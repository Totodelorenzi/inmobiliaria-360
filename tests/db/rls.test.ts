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

  test("una tabla o función nueva sin grants explícitos no queda expuesta", async () => {
    await db.transaction(async (tx) => {
      await tx.exec(`
        create table public.olvidada (id int generated always as identity);
        create function public.olvidada_fn() returns int language sql as 'select 1';
      `);
      const { rows } = await tx.query<{ rol: string; tabla: boolean; secuencia: boolean; funcion: boolean }>(`
        select r as rol,
          has_table_privilege(r, 'public.olvidada', 'select,insert,update,delete') as tabla,
          has_sequence_privilege(r, 'public.olvidada_id_seq', 'usage,select,update') as secuencia,
          has_function_privilege(r, 'public.olvidada_fn()', 'execute') as funcion
        from unnest(array['anon', 'authenticated']) r`);
      assert.deepEqual(rows, [
        { rol: "anon", tabla: false, secuencia: false, funcion: false },
        { rol: "authenticated", tabla: false, secuencia: false, funcion: false },
      ]);
      await tx.rollback();
    });
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

describe("varias inmobiliarias", () => {
  const insertarPropiedad = (agencia: string, slug: string) =>
    `insert into properties (agency_id, titulo, slug, operacion, tipo) values ('${agencia}', 'X', '${slug}', 'venta', 'casa')`;

  test("dos inmobiliarias pueden usar el mismo slug; dentro de una, no", async () => {
    await db.transaction(async (tx) => {
      await tx.exec(insertarPropiedad(ID.agenciaA, "depto-palermo"));
      await tx.exec(insertarPropiedad(ID.agenciaB, "depto-palermo"));
      await assert.rejects(tx.exec(insertarPropiedad(ID.agenciaA, "depto-palermo")), /duplicate key/);
      await tx.rollback();
    });
  });

  test("el admin edita la marca de su inmobiliaria, pero no su subdominio ni su dominio", async () => {
    await como(db, "adminA", async (tx) => {
      assert.equal((await tx.query("update agencies set nombre = 'Nueva A' where id = $1", [ID.agenciaA])).affectedRows, 1);
      await assert.rejects(tx.query("update agencies set subdominio = 'robado' where id = $1", [ID.agenciaA]), RLS);
    });
    await assert.rejects(como(db, "adminA", (tx) => tx.query("update agencies set dominio_propio = 'x.com.ar' where id = $1", [ID.agenciaA])), RLS);
  });

  test("subdominio y dominio propio: únicos y con formato válido", async () => {
    const probar = (sql: string) => como(db, "servicio", (tx) => tx.query(sql));
    for (const sub of ["app", "www", "Mayus", "a", "-guion", "doble--guion", "con.punto"]) {
      await assert.rejects(probar(`update agencies set subdominio = '${sub}' where id = '${ID.agenciaA}'`), /check constraint/, sub);
    }
    await assert.rejects(probar(`update agencies set subdominio = 'agencia-b' where id = '${ID.agenciaA}'`), /duplicate key/);
    for (const dominio of ["https://x.com", "www.x.com", "sinpunto", "X.COM"]) {
      await assert.rejects(probar(`update agencies set dominio_propio = '${dominio}' where id = '${ID.agenciaA}'`), /check constraint/, dominio);
    }
    await probar(`update agencies set dominio_propio = 'inmobiliaria-a.com.ar' where id = '${ID.agenciaA}'`);
  });

  test("superadmins: cada uno solo ve su propia fila y nadie se da de alta solo", async () => {
    await db.transaction(async (tx) => {
      await tx.exec(`insert into platform_admins (user_id) values ('${ID.adminA}')`);
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ID.adminA, role: "authenticated" })]);
      await tx.exec("set local role authenticated");
      assert.equal(await contar(tx, "select * from platform_admins"), 1);
      await tx.rollback();
    });
    assert.equal(await como(db, "adminB", (tx) => contar(tx, "select * from platform_admins")), 0);
    await assert.rejects(como(db, "adminB", (tx) => tx.query(`insert into platform_admins (user_id) values ('${ID.adminB}')`)), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query("select * from platform_admins")), RLS);
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

describe("datos de ejemplo", () => {
  test("la actividad del seed respeta todas las restricciones de la base", async () => {
    const { generarActividad } = await import("../../scripts/seed/actividad.ts");
    const propiedades = [
      {
        id: ID.pubA,
        titulo: "Depto publicado A",
        operacion: "venta" as const,
        fotos: 2,
        escenas: [
          { id: ID.escenaPubA1, nombre: "Living" },
          { id: ID.escenaPubA2, nombre: "Cocina" },
        ],
        planos: [{ id: ID.planoPubA, nombre: "Planta baja", puntos: ["Living"] }],
      },
      { id: ID.borradorA, titulo: "Borrador A", operacion: "alquiler" as const, fotos: 1, escenas: [{ id: ID.escenaBorradorA, nombre: "Living" }], planos: [] },
    ];
    const f = generarActividad(ID.agenciaA, propiedades, Date.now(), new Set(["A7K2"]));
    const insertar = async (tx: Parameters<Parameters<typeof como>[2]>[0], tabla: string, filas: object[]) => {
      if (filas.length === 0) return;
      const columnas = [...new Set(filas.flatMap((x) => Object.keys(x)))];
      await tx.query(
        `insert into ${tabla} (${columnas.join(", ")}) select ${columnas.join(", ")} from jsonb_populate_recordset(null::${tabla}, $1)`,
        [JSON.stringify(filas)],
      );
    };
    const resumen = await como(db, "servicio", async (tx) => {
      await insertar(tx, "visitors", f.visitantes.map((v) => ({ ...v, tracked_link_id: null })));
      await insertar(tx, "tracked_links", f.links);
      await insertar(tx, "visitor_events", f.eventos);
      await insertar(tx, "leads", f.leads);
      await insertar(tx, "visit_requests", f.pedidos);
      const { rows } = await tx.query<{ n: number }>("select count(*)::int as n from leads where es_demo");
      return rows[0].n;
    });
    assert.equal(resumen, f.leads.length);
  });
});

describe("webs de clientes", () => {
  const asesor = (agencia: string, extra = "") =>
    `insert into advisors (agency_id, nombre, whatsapp${extra ? ", activo" : ""}) values ('${agencia}', 'Lucía', '5492214567890'${extra}) returning id`;

  test("lo existente queda disponible, con el 360 activo y sin tema", async () => {
    await como(db, "anon", async (tx) => {
      const p = await tx.query<{ e: string }>("select distinct estado_comercial as e from properties");
      assert.deepEqual(p.rows, [{ e: "disponible" }]);
      const a = await tx.query<{ r: boolean; t: object }>("select distinct recorrido_activo as r, tema as t from agencies");
      assert.deepEqual(a.rows, [{ r: true, t: {} }]);
    });
  });

  test("el público ve los asesores activos; solo el admin los da de alta", async () => {
    await db.transaction(async (tx) => {
      await tx.exec(asesor(ID.agenciaA));
      await tx.exec(asesor(ID.agenciaA, ", false"));
      await tx.exec("set local role anon");
      assert.equal(await contar(tx, "select * from advisors"), 1);
      await tx.rollback();
    });
    await como(db, "adminA", async (tx) => {
      assert.equal((await tx.query(asesor(ID.agenciaA))).rows.length, 1);
    });
    await assert.rejects(como(db, "agenteA", (tx) => tx.query(asesor(ID.agenciaA))), RLS);
    await assert.rejects(como(db, "adminB", (tx) => tx.query(asesor(ID.agenciaA))), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query(asesor(ID.agenciaA))), RLS);
  });

  test("una propiedad no puede tener un asesor de otra inmobiliaria", async () => {
    await como(db, "servicio", async (tx) => {
      const { rows } = await tx.query<{ id: string }>(asesor(ID.agenciaB));
      assert.equal((await tx.query("update properties set asesor_id = $1 where id = $2", [rows[0].id, ID.pubB])).affectedRows, 1);
    });
    await assert.rejects(
      como(db, "servicio", async (tx) => {
        const { rows } = await tx.query<{ id: string }>(asesor(ID.agenciaB));
        await tx.query("update properties set asesor_id = $1 where id = $2", [rows[0].id, ID.pubA]);
      }),
      /misma inmobiliaria/,
    );
  });

  test("el admin cambia el switch del 360 y la matrícula, pero no el tema", async () => {
    await como(db, "adminA", async (tx) => {
      const r = await tx.query("update agencies set recorrido_activo = false, matricula = 'CMCPSI 1234' where id = $1", [ID.agenciaA]);
      assert.equal(r.affectedRows, 1);
    });
    await assert.rejects(como(db, "adminA", (tx) => tx.query(`update agencies set tema = '{"x":1}' where id = $1`, [ID.agenciaA])), RLS);
  });

  test("estado comercial y ambiente de la foto con valores válidos", async () => {
    await como(db, "adminA", async (tx) => {
      await tx.query("update properties set estado_comercial = 'reservada' where id = $1", [ID.pubA]);
      await tx.query("update property_photos set ambiente = 'Cocina' where id = $1", [ID.fotoPubA1]);
    });
    await assert.rejects(como(db, "adminA", (tx) => tx.query("update properties set estado_comercial = 'regalada' where id = $1", [ID.pubA])), /invalid input value/);
    await assert.rejects(como(db, "adminA", (tx) => tx.query("update property_photos set ambiente = '  ' where id = $1", [ID.fotoPubA1])), /check constraint/);
  });
});

describe("desarrolladora", () => {
  const P = {
    pubA: "a0000000-0000-4000-8000-00000000000a",
    borradorB: "a0000000-0000-4000-8000-00000000000b",
    pisoA: "a1000000-0000-4000-8000-00000000000a",
    pisoB: "a1000000-0000-4000-8000-00000000000b",
    tipoA: "a2000000-0000-4000-8000-00000000000a",
    tipoB: "a2000000-0000-4000-8000-00000000000b",
    unidadA: "a3000000-0000-4000-8000-00000000000a",
    unidadB: "a3000000-0000-4000-8000-00000000000b",
  };
  const TABLAS = ["projects", "project_floors", "unit_types", "unit_type_rooms", "units"];

  before(async () => {
    await db.exec(`
      insert into public.projects (id, agency_id, nombre, slug, publicado) values
        ('${P.pubA}', '${ID.agenciaA}', 'Edificio A', 'edificio-a', true),
        ('${P.borradorB}', '${ID.agenciaB}', 'Edificio B', 'edificio-b', false);
      insert into public.project_floors (id, project_id, numero, nombre, poligono) values
        ('${P.pisoA}', '${P.pubA}', 1, 'Piso 1', '[[10,10],[90,10],[90,20],[10,20]]'),
        ('${P.pisoB}', '${P.borradorB}', 1, 'Piso 1', null);
      insert into public.unit_types (id, project_id, nombre) values
        ('${P.tipoA}', '${P.pubA}', 'Tipo A'), ('${P.tipoB}', '${P.borradorB}', 'Tipo B');
      insert into public.unit_type_rooms (unit_type_id, nombre) values ('${P.tipoA}', 'Living'), ('${P.tipoB}', 'Living');
      insert into public.units (id, project_id, floor_id, unit_type_id, codigo) values
        ('${P.unidadA}', '${P.pubA}', '${P.pisoA}', '${P.tipoA}', '1A'),
        ('${P.unidadB}', '${P.borradorB}', '${P.pisoB}', '${P.tipoB}', '1A');
    `);
  });

  test("lo existente queda con el módulo inmobiliaria y el admin no lo cambia", async () => {
    await como(db, "anon", async (tx) => {
      const a = await tx.query<{ m: string[] }>("select distinct modulos as m from agencies");
      assert.deepEqual(a.rows, [{ m: ["inmobiliaria"] }]);
    });
    await assert.rejects(como(db, "adminA", (tx) => tx.query(`update agencies set modulos = '{desarrolladora}' where id = $1`, [ID.agenciaA])), RLS);
  });

  test("el público lee solo lo de proyectos publicados y no escribe", async () => {
    await como(db, "anon", async (tx) => {
      for (const tabla of TABLAS) assert.equal(await contar(tx, `select * from ${tabla}`), 1, tabla);
    });
    await assert.rejects(como(db, "anon", (tx) => tx.query("update units set estado = 'vendida'")), RLS);
    await assert.rejects(como(db, "anon", (tx) => tx.query("delete from projects")), RLS);
  });

  test("un tenant ve su borrador pero no el de otro", async () => {
    await como(db, "adminB", async (tx) => {
      for (const tabla of TABLAS) assert.equal(await contar(tx, `select * from ${tabla}`), 2, tabla);
    });
    await como(db, "agenteA", async (tx) => {
      for (const tabla of TABLAS) assert.equal(await contar(tx, `select * from ${tabla}`), 1, tabla);
    });
  });

  test("cada tenant edita lo suyo y nada de otro", async () => {
    await como(db, "agenteA", async (tx) => {
      assert.equal((await tx.query("update units set estado = 'reservada' where id = $1", [P.unidadA])).affectedRows, 1);
      assert.equal((await tx.query(`update project_floors set poligono = '[[0,0],[50,0],[50,50]]' where id = $1`, [P.pisoA])).affectedRows, 1);
      assert.equal((await tx.query("update unit_types set maqueta_url = 'https://x/m.webp' where id = $1", [P.tipoA])).affectedRows, 1);
    });
    await como(db, "adminB", async (tx) => {
      // El proyecto de A está publicado: B lo ve, pero sus cambios no tocan ninguna fila.
      assert.equal((await tx.query("update units set estado = 'vendida' where id = $1", [P.unidadA])).affectedRows, 0);
      assert.equal((await tx.query("update projects set nombre = 'hack' where id = $1", [P.pubA])).affectedRows, 0);
      assert.equal((await tx.query("update project_floors set poligono = null where id = $1", [P.pisoA])).affectedRows, 0);
      assert.equal((await tx.query("update unit_type_rooms set nombre = 'hack' where unit_type_id = $1", [P.tipoA])).affectedRows, 0);
      assert.equal((await tx.query("delete from unit_types where id = $1", [P.tipoA])).affectedRows, 0);
    });
    await assert.rejects(
      como(db, "adminB", (tx) => tx.query("insert into units (project_id, floor_id, unit_type_id, codigo) values ($1, $2, $3, '9Z')", [P.pubA, P.pisoA, P.tipoA])),
      RLS,
    );
    await assert.rejects(como(db, "adminB", (tx) => tx.query("insert into projects (agency_id, nombre, slug) values ($1, 'x', 'x')", [ID.agenciaA])), RLS);
  });

  test("una unidad no mezcla proyectos y los polígonos van en porcentajes", async () => {
    await assert.rejects(
      como(db, "servicio", (tx) => tx.query("insert into units (project_id, floor_id, unit_type_id, codigo) values ($1, $2, $3, '2A')", [P.pubA, P.pisoA, P.tipoB])),
      /mismo proyecto/,
    );
    for (const malo of ["[[0,0],[10,10]]", "[[0,0],[10,10],[120,5]]", '{"a":1}']) {
      await assert.rejects(como(db, "servicio", (tx) => tx.query("update units set poligono = $1 where id = $2", [malo, P.unidadA])), /check constraint/);
    }
  });

  test("landing: espacios e imágenes se leen si el proyecto está publicado y los edita solo su tenant", async (t) => {
    const E = { pubA: "a4000000-0000-4000-8000-00000000000a", borradorB: "a4000000-0000-4000-8000-00000000000b" };
    // Fuera de `como` (que siempre revierte): las filas quedan para los usuarios del test y se borran al final.
    await db.query(
      "insert into project_spaces (id, project_id, floor_id, nombre, slug, punto) values ($1, $3, $5, 'Pileta', 'pileta', '[40, 60]'), ($2, $4, $6, 'SUM', 'sum', null)",
      [E.pubA, E.borradorB, P.pubA, P.borradorB, P.pisoA, P.pisoB],
    );
    await db.query("insert into project_space_images (space_id, nombre, url) values ($1, 'Pileta', 'https://x/p.webp'), ($2, 'SUM', null)", [E.pubA, E.borradorB]);
    t.after(() => db.query("delete from project_spaces where id in ($1, $2)", [E.pubA, E.borradorB]));
    await como(db, "anon", async (tx) => {
      assert.equal(await contar(tx, "select * from project_spaces"), 1);
      assert.equal(await contar(tx, "select * from project_space_images"), 1);
    });
    await assert.rejects(como(db, "anon", (tx) => tx.query("update project_spaces set nombre = 'hack'")), RLS);
    await como(db, "adminB", async (tx) => {
      assert.equal(await contar(tx, "select * from project_spaces"), 2);
      assert.equal((await tx.query("update project_spaces set nombre = 'hack' where id = $1", [E.pubA])).affectedRows, 0);
      assert.equal((await tx.query("update project_space_images set url = null where space_id = $1", [E.pubA])).affectedRows, 0);
      assert.equal((await tx.query("update project_spaces set punto = '[10, 10]' where id = $1", [E.borradorB])).affectedRows, 1);
    });
    await assert.rejects(
      como(db, "adminB", (tx) => tx.query("insert into project_space_images (space_id, url) values ($1, 'https://x/y.webp')", [E.pubA])),
      RLS,
    );
    // El piso tiene que ser del mismo proyecto y el punto va en porcentajes.
    await assert.rejects(
      como(db, "servicio", (tx) => tx.query("insert into project_spaces (project_id, floor_id, nombre, slug) values ($1, $2, 'Gym', 'gym')", [P.pubA, P.pisoB])),
      /mismo proyecto/,
    );
    for (const malo of ["[120, 5]", "[1, 2, 3]", '{"x":1}']) {
      await assert.rejects(como(db, "servicio", (tx) => tx.query("update project_spaces set punto = $1 where id = $2", [malo, E.pubA])), /check constraint/);
    }
  });

  test("landing: textos y vistas del proyecto, local en alquiler y cocheras", async () => {
    await como(db, "agenteA", async (tx) => {
      const r = await tx.query(
        `update projects set sobre_titulo = 'Quiénes somos', sobre_texto = 'Texto', entrega = 'Diciembre 2028',
           amenities = '{"SUM con parrilla","Pileta"}', transicion = 'secuencia', color_fondo = '#101215',
           secuencia = '{"patron": "https://x/c-{n}.webp", "cuadros": 60, "digitos": 4, "inicio": 1, "ancho": 1920, "alto": 1080}'
         where id = $1`,
        [P.pubA],
      );
      assert.equal(r.affectedRows, 1);
      await tx.query("update project_floors set poligono2 = '[[0,0],[50,0],[50,50]]' where id = $1", [P.pisoA]);
      await tx.query("update units set categoria = 'local', operacion = 'alquiler', estado = 'alquilada' where id = $1", [P.unidadA]);
    });
    for (const malo of [
      "transicion = 'giro'",
      "color_fondo = 'negro'",
      `amenities = '{"",  "Pileta"}'`,
      `secuencia = '{"patron": "http://x/c.webp", "cuadros": 60, "ancho": 1, "alto": 1}'`,
      `secuencia = '{"patron": "https://x/c-{n}.webp", "cuadros": 1, "ancho": 1, "alto": 1}'`,
    ]) {
      await assert.rejects(como(db, "agenteA", (tx) => tx.query(`update projects set ${malo} where id = $1`, [P.pubA])), /check constraint/, malo);
    }
    await assert.rejects(como(db, "agenteA", (tx) => tx.query("update units set categoria = 'baulera' where id = $1", [P.unidadA])), /check constraint/);
    await como(db, "adminB", async (tx) => {
      assert.equal((await tx.query("update projects set sobre_texto = 'hack' where id = $1", [P.pubA])).affectedRows, 0);
    });
  });

  test("landing: los UTM del lead los escribe el servidor y el admin no los cambia", async (t) => {
    const lead = "a5000000-0000-4000-8000-00000000000a";
    await db.query("insert into leads (id, agency_id, nombre, telefono, utm_source, utm_campaign) values ($1, $2, 'Eva', '1122', 'instagram', 'lanzamiento')", [lead, ID.agenciaA]);
    t.after(() => db.query("delete from leads where id = $1", [lead]));
    await como(db, "adminA", async (tx) => {
      const { rows } = await tx.query<{ utm_campaign: string }>("select utm_campaign from leads where id = $1", [lead]);
      assert.equal(rows[0].utm_campaign, "lanzamiento");
    });
    await assert.rejects(como(db, "adminA", (tx) => tx.query("update leads set utm_campaign = 'otra' where id = $1", [lead])), RLS);
  });
});
