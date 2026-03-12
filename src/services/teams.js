import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Crear equipo
export const createTeam = async (name, creatorId, memberIds = []) => {
  try {
    const teamsRef = collection(db, 'teams');
    const newTeamRef = doc(teamsRef);
    
    const teamData = {
      name: name || `Equipo ${Date.now()}`,
      members: [creatorId, ...memberIds],
      createdBy: creatorId,
      status: memberIds.length > 0 ? 'pending' : 'active',
      createdAt: serverTimestamp()
    };

    await setDoc(newTeamRef, teamData);
    return newTeamRef.id;
  } catch (error) {
    throw error;
  }
};

// Enviar invitación a equipo
export const inviteToTeam = async (teamId, fromUserId, toUserId) => {
  try {
    const invitationsRef = collection(db, 'teamInvitations');
    const newInvitationRef = doc(invitationsRef);
    
    await setDoc(newInvitationRef, {
      teamId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Actualizar estado del equipo a pending si hay invitaciones
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { status: 'pending' });

    return newInvitationRef.id;
  } catch (error) {
    throw error;
  }
};

// Aceptar invitación
export const acceptInvitation = async (invitationId) => {
  try {
    const invitationRef = doc(db, 'teamInvitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (!invitationSnap.exists()) {
      throw new Error('Invitación no encontrada');
    }

    const invitationData = invitationSnap.data();
    
    if (invitationData.status !== 'pending') {
      throw new Error('La invitación ya fue procesada');
    }

    // Actualizar invitación
    await updateDoc(invitationRef, { status: 'accepted' });

    // Agregar usuario al equipo
    const teamRef = doc(db, 'teams', invitationData.teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      const teamData = teamSnap.data();
      const updatedMembers = [...teamData.members, invitationData.toUserId];
      
      // Verificar si el equipo está completo (todos aceptaron)
      const pendingInvitationsRef = collection(db, 'teamInvitations');
      const pendingQuery = query(
        pendingInvitationsRef,
        where('teamId', '==', invitationData.teamId),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(pendingQuery);
      
      const newStatus = pendingSnap.empty ? 'active' : 'pending';
      
      await updateDoc(teamRef, {
        members: updatedMembers,
        status: newStatus
      });
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// Rechazar invitación
export const rejectInvitation = async (invitationId) => {
  try {
    const invitationRef = doc(db, 'teamInvitations', invitationId);
    await updateDoc(invitationRef, { status: 'rejected' });
    return true;
  } catch (error) {
    throw error;
  }
};

// Obtener equipo por ID
export const getTeamById = async (teamId) => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return null;
    }

    return {
      id: teamSnap.id,
      ...teamSnap.data()
    };
  } catch (error) {
    throw error;
  }
};

// Obtener equipos de un usuario
export const getTeamsByUser = async (userId) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(
      teamsRef,
      where('members', 'array-contains', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener equipos disponibles para un evento (con número exacto de miembros)
export const getAvailableTeamsForEvent = async (requiredMembers) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(
      teamsRef,
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    // Filtrar equipos que tienen exactamente el número requerido de miembros
    const teams = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(team => team.members && team.members.length === requiredMembers);

    return teams;
  } catch (error) {
    throw error;
  }
};

// Obtener invitaciones pendientes de un usuario
export const getPendingInvitations = async (userId) => {
  try {
    const invitationsRef = collection(db, 'teamInvitations');
    const q = query(
      invitationsRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    // Si falla por falta de índice, intentar sin orderBy
    try {
      const invitationsRef = collection(db, 'teamInvitations');
      const q = query(
        invitationsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      const invitations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar en memoria
      return invitations.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    } catch (retryError) {
      throw error;
    }
  }
};

// Eliminar equipo
export const deleteTeam = async (teamId) => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await deleteDoc(teamRef);
    
    // Eliminar invitaciones relacionadas
    const invitationsRef = collection(db, 'teamInvitations');
    const q = query(invitationsRef, where('teamId', '==', teamId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Actualizar equipo (agregar/remover miembros manualmente)
export const updateTeam = async (teamId, updates) => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    throw error;
  }
};
