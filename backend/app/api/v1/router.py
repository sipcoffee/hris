from fastapi import APIRouter

from app.api.v1 import (
    auth,
    departments,
    employees,
    leave_balances,
    leave_requests,
    leave_types,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(employees.router)
api_router.include_router(leave_types.router)
api_router.include_router(leave_balances.router)
api_router.include_router(leave_requests.router)
