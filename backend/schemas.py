from pydantic import BaseModel
from typing import List, Optional

class PermissionBase(BaseModel):
    menu_item: str
    has_access: bool

class PermissionCreate(PermissionBase):
    pass

class Permission(PermissionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    avatar_url: Optional[str] = None
    permissions: List[Permission] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_admin: bool
    avatar_url: Optional[str] = None
    permissions: List[str]

class TokenData(BaseModel):
    username: Optional[str] = None
