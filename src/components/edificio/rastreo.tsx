"use client";

import { useEffect } from "react";
import { registrar } from "@/lib/tracking/cliente";

type Props = { tipo: "floor_view"; projectId: string; floorId: string } | { tipo: "unit_view"; projectId: string; floorId: string; unitId: string };

/** Registra que el visitante vio un piso o una unidad (una vez por montaje). */
export function RastreoEdificio(props: Props) {
  const { tipo, projectId, floorId } = props;
  const unitId = props.tipo === "unit_view" ? props.unitId : undefined;
  useEffect(() => {
    registrar({ tipo, projectId, floorId, ...(unitId ? { unitId } : {}) });
  }, [tipo, projectId, floorId, unitId]);
  return null;
}
