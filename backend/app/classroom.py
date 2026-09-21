import asyncio
import time
import logging
from typing import Dict, Set, List, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("classbridge.classroom")

class ClassroomRoom:
    def __init__(self, room_id: str, default_target_lang: str = "ta", source_lang: str = "en"):
        self.room_id = room_id
        self.teacher_ws: Optional[WebSocket] = None
        self.students: Set[WebSocket] = set()
        self.student_roster: Dict[WebSocket, Dict[str, Any]] = {}
        self.segments: List[Dict[str, Any]] = []
        self.current_time_offset: float = 0.0
        self.source_lang: str = source_lang
        self.default_target_lang: str = default_target_lang
        self.is_camera_on: bool = False
        self.is_screen_sharing: bool = False
        self.created_at: float = time.time()
        self.last_active: float = time.time()

    @property
    def student_count(self) -> int:
        return len(self.students)

    @property
    def has_teacher(self) -> bool:
        return self.teacher_ws is not None

    def identify_student(self, ws: WebSocket, name: str, roll_no: str, target_lang: str = "ta", student_tab_id: str = "") -> Dict[str, Any]:
        info = {
            "id": student_tab_id or f"ws_{abs(hash(ws))}",
            "name": name.strip(),
            "roll_no": roll_no.strip().upper(),
            "target_lang": target_lang,
            "joined_at": time.time(),
            "status": "online"
        }
        self.student_roster[ws] = info
        self.last_active = time.time()
        return info

    def get_roster(self) -> List[Dict[str, Any]]:
        return list(self.student_roster.values())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "room_id": self.room_id,
            "has_teacher": self.has_teacher,
            "student_count": self.student_count,
            "total_segments": len(self.segments),
            "source_lang": self.source_lang,
            "default_target_lang": self.default_target_lang,
            "is_camera_on": self.is_camera_on,
            "is_screen_sharing": self.is_screen_sharing,
            "roster": self.get_roster(),
            "created_at": self.created_at,
            "last_active": self.last_active
        }


class ClassroomManager:
    """
    Manages active classroom rooms, WebSocket connections for Teachers and Students,
    and real-time fan-out broadcasting of lecture captions.
    """
    def __init__(self):
        self.rooms: Dict[str, ClassroomRoom] = {}
        self._lock = asyncio.Lock()

    def get_or_create_room(self, room_id: str, default_target_lang: str = "ta", source_lang: str = "en") -> ClassroomRoom:
        rid = room_id.strip().upper()
        if rid not in self.rooms:
            logger.info(f"Creating new classroom room: {rid}")
            self.rooms[rid] = ClassroomRoom(rid, default_target_lang, source_lang)
        return self.rooms[rid]

    def get_room(self, room_id: str) -> Optional[ClassroomRoom]:
        return self.rooms.get(room_id.strip().upper())

    async def register_teacher(self, room_id: str, websocket: WebSocket, source_lang: str = "en", target_lang: str = "ta") -> ClassroomRoom:
        room = self.get_or_create_room(room_id, default_target_lang=target_lang, source_lang=source_lang)
        room.teacher_ws = websocket
        room.source_lang = source_lang
        room.last_active = time.time()
        logger.info(f"Teacher registered for room {room.room_id}. Total students: {room.student_count}")
        await self.broadcast_presence(room.room_id)
        return room

    async def register_student(self, room_id: str, websocket: WebSocket) -> ClassroomRoom:
        room = self.get_or_create_room(room_id)
        room.students.add(websocket)
        room.last_active = time.time()
        logger.info(f"Student joined room {room.room_id}. Total students: {room.student_count}")
        await self.broadcast_presence(room.room_id)
        return room

    async def remove_connection(self, room_id: str, websocket: WebSocket, role: str):
        room = self.get_room(room_id)
        if not room:
            return

        room.last_active = time.time()
        if role == "teacher" and room.teacher_ws == websocket:
            room.teacher_ws = None
            logger.info(f"Teacher disconnected from room {room.room_id}")
            # Notify students that teacher paused/disconnected
            await self.broadcast_to_room(room.room_id, {
                "type": "teacher_status",
                "status": "offline",
                "message": "Teacher microphone has paused or disconnected."
            })
        elif websocket in room.students:
            room.students.remove(websocket)
            removed_student = room.student_roster.pop(websocket, None)
            if removed_student:
                logger.info(f"Student {removed_student.get('name')} ({removed_student.get('roll_no')}) disconnected from room {room.room_id}")
            logger.info(f"Student disconnected from room {room.room_id}. Remaining: {room.student_count}")
            await self.broadcast_roster(room.room_id)

        await self.broadcast_presence(room.room_id)

    async def broadcast_to_room(self, room_id: str, message: Dict[str, Any], include_teacher: bool = True):
        """
        Fans out a message to all connected clients in a specific classroom room.
        """
        room = self.get_room(room_id)
        if not room:
            return

        dead_sockets: List[WebSocket] = []

        # Send to students
        for ws in list(room.students):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to send to student in {room_id}: {e}")
                dead_sockets.append(ws)

        # Cleanup dead student connections
        for dead in dead_sockets:
            room.students.discard(dead)
            room.student_roster.pop(dead, None)

        # Send to teacher if requested
        if include_teacher and room.teacher_ws:
            try:
                await room.teacher_ws.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to send to teacher in {room_id}: {e}")
                room.teacher_ws = None

    async def broadcast_presence(self, room_id: str):
        """
        Broadcasts current room participant count and host status to everyone in the room.
        """
        room = self.get_room(room_id)
        if not room:
            return

        presence_msg = {
            "type": "room_presence",
            "room_id": room.room_id,
            "has_teacher": room.has_teacher,
            "student_count": room.student_count,
            "source_lang": room.source_lang,
            "is_camera_on": room.is_camera_on,
            "is_screen_sharing": room.is_screen_sharing,
            "total_segments": len(room.segments)
        }
        await self.broadcast_to_room(room.room_id, presence_msg, include_teacher=True)

    async def broadcast_roster(self, room_id: str):
        """
        Broadcasts the current verified student roster to the teacher and participants.
        """
        room = self.get_room(room_id)
        if not room:
            return
        roster_msg = {
            "type": "roster_update",
            "room_id": room.room_id,
            "students": room.get_roster(),
            "student_count": room.student_count
        }
        await self.broadcast_to_room(room.room_id, roster_msg, include_teacher=True)

    async def broadcast_video_frame(self, room_id: str, frame_data: str):
        """
        Relays teacher video frame to all student screens in the room.
        """
        room = self.get_room(room_id)
        if not room or not room.students:
            return
        frame_msg = {
            "type": "video_frame",
            "room_id": room.room_id,
            "frame": frame_data
        }
        await self.broadcast_to_room(room.room_id, frame_msg, include_teacher=False)

    async def broadcast_video_state(self, room_id: str, is_camera_on: bool, is_screen_sharing: bool = False):
        room = self.get_room(room_id)
        if not room:
            return
        room.is_camera_on = is_camera_on
        room.is_screen_sharing = is_screen_sharing
        state_msg = {
            "type": "video_state",
            "room_id": room.room_id,
            "is_camera_on": is_camera_on,
            "is_screen_sharing": is_screen_sharing
        }
        await self.broadcast_to_room(room.room_id, state_msg, include_teacher=True)

    def add_segment_to_room(self, room_id: str, segment: Dict[str, Any]):
        room = self.get_room(room_id)
        if room:
            room.segments.append(segment)
            room.last_active = time.time()

    def get_all_rooms_summary(self) -> List[Dict[str, Any]]:
        return [room.to_dict() for room in self.rooms.values()]


# Global singleton manager
classroom_manager = ClassroomManager()
